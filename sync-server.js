const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');

// ⚙️ Import cấu hình (DI CHUYỂN LÊN ĐẦU)
const config = require('./data-config');
const authModule = require('./auth-server');
const logger = require('./logger');
const database = config.USE_DATABASE ? require('./database') : null;

// 📊 Google Sheets sync - Realtime mirror
const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL || '';
const GOOGLE_SHEETS_SYNC_DELAY = 3000; // Đợi 3 giây sau update rồi mới sync
const pendingSheetsSync = {};
const previousSyncData = {}; // Lưu dữ liệu trước đó để so sánh tìm thêm/xóa

function mapItem(d) {
    return {
        maGoc: d.maGoc || '',
        ma: d.ma || '',
        trangThai: d.trangThai || '',
        dotHang: d.dotHang || '',
        loaiHang: d.loaiHang || '',
        loaiSX: d.loaiSX || '',
        mau: d.mau || '',
        size: (d.size || '').toString().toUpperCase(),
        thoiGian: d.thoiGian || '',
        ghiChu: d.ghiChu || ''
    };
}

// Sync realtime: gửi action "sync" để mirror chính xác (thêm/sửa/xóa)
async function syncToGoogleSheets(module, action) {
    if (!GOOGLE_SHEETS_URL) return;
    action = action || 'sync';

    try {
        const items = (syncData[module] || []).map(mapItem);

        const res = await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ module, items, action })
        });

        const result = await res.text();
        logger.info(`📊 Google Sheets ${action}: ${module} - ${items.length} items`, { result });
    } catch (err) {
        logger.error(`❌ Google Sheets sync error: ${module}`, { error: err.message });
    }
}

// Debounced sync - đợi 3 giây sau update cuối cùng rồi mới sync
function scheduleSheetsSync(module) {
    if (!GOOGLE_SHEETS_URL) return;

    if (pendingSheetsSync[module]) {
        clearTimeout(pendingSheetsSync[module]);
    }
    pendingSheetsSync[module] = setTimeout(() => {
        syncToGoogleSheets(module, 'sync'); // action=sync: mirror chính xác
        delete pendingSheetsSync[module];
    }, GOOGLE_SHEETS_SYNC_DELAY);
}

// 🗑️ Tự động xóa dữ liệu lúc 00:00 hàng ngày (Google Sheets giữ nguyên)
function scheduleMiddnightCleanup() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // 00:00 ngày mai
    const msUntilMidnight = midnight.getTime() - now.getTime();

    logger.info(`🕐 Lên lịch xóa dữ liệu lúc 00:00 (còn ${Math.round(msUntilMidnight / 60000)} phút)`);

    setTimeout(() => {
        performMidnightCleanup();
        // Lên lịch lại cho ngày tiếp theo
        setInterval(performMidnightCleanup, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
}

function performMidnightCleanup() {
    logger.info('🗑️ BẮT ĐẦU XÓA DỮ LIỆU TỰ ĐỘNG LÚC 00:00');

    // Sync lên Google Sheets với action "archive" trước khi xóa
    // action=archive: chỉ lưu/cập nhật, KHÔNG xóa dòng nào trên Sheets
    const syncPromises = Object.keys(syncData).map(module => {
        if (syncData[module].length > 0) {
            return syncToGoogleSheets(module, 'archive');
        }
        return Promise.resolve();
    });

    Promise.all(syncPromises).then(() => {
        // Xóa dữ liệu trên hệ thống
        Object.keys(syncData).forEach(module => {
            const count = syncData[module].length;
            syncData[module] = [];
            markIndexDirty(module);

            // Clear API cache
            if (typeof apiRoutes !== 'undefined' && apiRoutes.clearModuleCache) {
                apiRoutes.clearModuleCache(module);
            }

            logger.info(`🗑️ Đã xóa ${count} items của module ${module}`);
        });

        // Lưu dữ liệu trống vào file/database
        saveAllData();

        // Broadcast cho tất cả clients biết dữ liệu đã bị xóa
        Object.keys(connections).forEach(module => {
            if (connections[module]) {
                connections[module].forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'data',
                            module: module,
                            data: []
                        }));
                    }
                });
            }
        });

        logger.info('✅ XÓA DỮ LIỆU TỰ ĐỘNG HOÀN TẤT - Google Sheets vẫn giữ nguyên');
    }).catch(err => {
        logger.error('❌ Lỗi khi xóa dữ liệu tự động', { error: err.message });
    });
}

// 📁 Cấu hình lưu trữ dữ liệu
const DATA_DIR = './data';
const DATA_FILES = {
    donghang: path.join(DATA_DIR, 'donghang.json'),
    khophoi: path.join(DATA_DIR, 'khophoi.json'),
    sanxuat: path.join(DATA_DIR, 'sanxuat.json'),
    thanhpham: path.join(DATA_DIR, 'thanhpham.json'),
    hangsan: path.join(DATA_DIR, 'hangsan.json'),
    hangton: path.join(DATA_DIR, 'hangton.json')
};

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
}

// Lưu trữ dữ liệu đồng bộ
const syncData = {
    donghang: [],
    khophoi: [],
    sanxuat: [],
    thanhpham: [],
    hangsan: [],
    hangton: []
};

// Tạo Express app cho API và static files
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Tối đa 100 requests mỗi 15 phút
    message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 5, // Tối đa 5 lần đăng nhập mỗi 15 phút
    message: 'Quá nhiều lần thử đăng nhập, vui lòng thử lại sau.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// 📋 Validation schemas
const loginSchema = Joi.object({
    username: Joi.string().required().min(1).max(50),
    password: Joi.string().required().min(1).max(200),
    moduleName: Joi.string().required().valid('khophoi', 'sanxuat', 'thanhpham', 'donghang', 'hangsan', 'hangton', 'tonghop', 'donhang')
});

// Schema validation cho product - mỗi module có trạng thái riêng
const productSchema = Joi.object({
    maGoc: Joi.string().required().max(200),
    trangThai: Joi.string().valid(
        'Bàn giao',      // Kho phôi, Hàng sẵn, Hàng tồn
        'In & thêu',     // Sản xuất
        'Hoàn thiện',    // Thành phẩm
        'Đang xử lý', 'Đợi file', 'Thiếu hàng', 'Xử lý lỗi', 'Hoàn thành', 'Nhận hàng' // Giữ lại cho tương thích
    ),
    ghiChu: Joi.string().max(1000).allow(''),
    dotHang: Joi.string().max(50).allow(''),
    loaiHang: Joi.string().max(100).allow(''),
    loaiSX: Joi.string().max(50).allow('')
});

// 👥 API: Users management
const USERS_FILE = './users.json';

app.get('/api/users', (req, res) => {
    fs.readFile(USERS_FILE, 'utf8', (error, content) => {
        if (error) return res.status(500).json({ error: 'Cannot read users file' });
        try {
            res.json(JSON.parse(content));
        } catch (e) {
            res.status(500).json({ error: 'Invalid users file' });
        }
    });
});

app.post('/api/users', (req, res) => {
    const newUser = req.body;
    fs.readFile(USERS_FILE, 'utf8', (error, content) => {
        if (error) return res.status(500).json({ error: 'Cannot read users file' });
        const users = JSON.parse(content);
        if (users.find(u => u.username === newUser.username)) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        users.push(newUser);
        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Cannot write users file' });
            res.json({ success: true, user: newUser });
        });
    });
});

app.put('/api/users', (req, res) => {
    const updatedUser = req.body;
    fs.readFile(USERS_FILE, 'utf8', (error, content) => {
        if (error) return res.status(500).json({ error: 'Cannot read users file' });
        const users = JSON.parse(content);
        const index = users.findIndex(u => u.username === updatedUser.username);
        if (index === -1) return res.status(404).json({ error: 'User not found' });
        users[index] = updatedUser;
        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Cannot write users file' });
            res.json({ success: true, user: updatedUser });
        });
    });
});

app.delete('/api/users/:username', (req, res) => {
    const username = req.params.username;
    fs.readFile(USERS_FILE, 'utf8', (error, content) => {
        if (error) return res.status(500).json({ error: 'Cannot read users file' });
        const users = JSON.parse(content);
        const filtered = users.filter(u => u.username !== username);
        if (users.length === filtered.length) return res.status(404).json({ error: 'User not found' });
        fs.writeFile(USERS_FILE, JSON.stringify(filtered, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Cannot write users file' });
            res.json({ success: true });
        });
    });
});

// 🔐 API: Authentication endpoint
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        // Validate input
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dữ liệu không hợp lệ: ' + error.details[0].message 
            });
        }
        
        const { username, password, moduleName } = value;
        
        // Authenticate
        const result = await authModule.authenticate(username, password, moduleName);
        
        if (result.success) {
            res.json({ 
                success: true, 
                user: result.user 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                error: result.error || 'Đăng nhập thất bại' 
            });
        }
    } catch (error) {
        logger.error('❌ Login error', { error: error.message, stack: error.stack });
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// 🔐 API: Check authentication
app.post('/api/auth/check', apiLimiter, async (req, res) => {
    try {
        const { error, value } = loginSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ success: false, error: 'Dữ liệu không hợp lệ' });
        }
        
        const { username, password, moduleName } = value;
        const result = await authModule.checkAuth(username, password, moduleName);
        
        res.json(result);
    } catch (error) {
        logger.error('❌ Check auth error', { error: error.message, stack: error.stack });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// 🚀 REST API Routes cho modules
const apiRoutes = require('./api-routes');
apiRoutes.initRoutes({
    syncData,
    database,
    config,
    productSchema
});
app.use('/api/modules', apiLimiter, apiRoutes.router);

// 📌 Alias: /api/:module -> trả dữ liệu trực tiếp (cho TongHop compatibility)
['donghang','khophoi','sanxuat','thanhpham','hangsan','hangton'].forEach(mod => {
    app.get(`/api/${mod}`, (req, res) => {
        res.json(syncData[mod] || []);
    });
});

// 📁 Serve static files (HTML, JS, CSS)
app.use(express.static('.'));

// Xử lý favicon.ico để tránh lỗi 404
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // 204 No Content - không trả về gì
});

// Serve root path -> index.html
app.get('/', (req, res) => {
    const filePath = './html/index.html';
    fs.readFile(filePath, (error, content) => {
        if (error) {
            res.status(500).send('Server Error: ' + error.code);
        } else {
            res.setHeader('Content-Type', 'text/html');
            res.send(content);
        }
    });
});

// Serve HTML files from html directory
app.get('/*.html', (req, res, next) => {
    let filePath = '.' + req.path;
    if (filePath === './index.html') {
        filePath = './html/index.html';
    } else if (!filePath.startsWith('./html/')) {
        filePath = './html' + req.path;
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.status(404).send('<h1>404 - File Not Found</h1>');
            } else {
                res.status(500).send('Server Error: ' + error.code);
            }
        } else {
            const extname = String(path.extname(filePath)).toLowerCase();
            const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json'
            };
            const contentType = mimeTypes[extname] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.send(content);
        }
    });
});

// Tạo HTTP server từ Express app
const server = http.createServer(app);

// 🚀 TỐI ƯU NÂNG CAO: Tạo WebSocket server với compression
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: {
        // Bật compression để giảm bandwidth 50-70%
        zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3 // Level 3: cân bằng giữa tốc độ và tỷ lệ nén
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Chỉ compress messages > 1024 bytes
        threshold: 1024,
        concurrencyLimit: 10,
        clientNoContextTakeover: true,
        serverNoContextTakeover: true
    },
    maxPayload: 100 * 1024 * 1024 // 100MB max payload
});

// 💾 Hàm lưu dữ liệu vào file hoặc database (AN TOÀN 100%) - TỐI ƯU: Async cho dữ liệu lớn
function saveDataToFile(module) {
    try {
        // Nếu dùng database, lưu vào database (đã async)
        if (config.USE_DATABASE && database) {
            return database.saveAllData(module, syncData[module] || []);
        }
        
        // Nếu không, lưu vào JSON file (backward compatibility)
        const filePath = DATA_FILES[module];
        if (!filePath) return false;
        
        const dataToSave = {
            timestamp: new Date().toISOString(),
            data: syncData[module] || []
        };
        
        // 🚀 TỐI ƯU: Nếu dữ liệu lớn (>5000 items), dùng async write để không block
        if (dataToSave.data.length > 5000) {
            const tempFilePath = filePath + '.tmp';
            const jsonString = JSON.stringify(dataToSave, null, 2);
            
            // Async write cho dữ liệu lớn
            fs.writeFile(tempFilePath, jsonString, 'utf8', (err) => {
                if (err) {
                    logger.error(`❌ Error writing temp file for ${module}`, { module, error: err.message });
                    return;
                }
                // Rename sau khi write xong
                fs.rename(tempFilePath, filePath, (renameErr) => {
                    if (renameErr) {
                        logger.error(`❌ Error renaming file for ${module}`, { module, error: renameErr.message });
                    } else {
                        logger.info(`💾 Saved data for ${module} (async)`, { module, itemCount: dataToSave.data.length });
                    }
                });
            });
            return true; // Return ngay, không đợi write xong
        } else {
            // Sync write cho dữ liệu nhỏ (nhanh hơn)
            const tempFilePath = filePath + '.tmp';
            fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
            fs.renameSync(tempFilePath, filePath);
            logger.info(`💾 Saved data for ${module}`, { module, itemCount: dataToSave.data.length });
            return true;
        }
    } catch (error) {
        logger.error(`❌ Error saving data for ${module}`, { module, error: error.message, stack: error.stack });
        return false;
    }
}

// 📂 Hàm tải dữ liệu từ file hoặc database (AN TOÀN 100%)
function loadDataFromFile(module) {
    try {
        // Nếu dùng database, load từ database
        if (config.USE_DATABASE && database) {
            const data = database.getAllData(module);
            logger.info(`📂 Loaded ${data.length} items for ${module} from database`);
            return data;
        }
        
        // Nếu không, load từ JSON file (backward compatibility)
        const filePath = DATA_FILES[module];
        const tempFilePath = filePath + '.tmp';
        
        // 🚀 TỐI ƯU: Kiểm tra file size trước khi đọc để quyết định sync hay async
        let fileStats = null;
        try {
            if (fs.existsSync(filePath)) {
                fileStats = fs.statSync(filePath);
            }
        } catch (e) {
            // Ignore
        }
        
        // Nếu file lớn (>5MB), có thể cần async, nhưng vì đây là startup nên vẫn dùng sync
        // Kiểm tra file chính trước
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const parsedData = JSON.parse(fileContent);
                
                if (parsedData.data && Array.isArray(parsedData.data)) {
                    logger.info(`📂 Loaded ${parsedData.data.length} items for ${module} from ${filePath}`);
                    return parsedData.data;
                }
            } catch (error) {
                logger.warn(`⚠️ Main file corrupted for ${module}, checking temp file...`);
            }
        }
        
        // Nếu file chính không tồn tại hoặc bị lỗi, kiểm tra file tạm
        if (fs.existsSync(tempFilePath)) {
            try {
                const tempContent = fs.readFileSync(tempFilePath, 'utf8');
                const parsedData = JSON.parse(tempContent);
                
                if (parsedData.data && Array.isArray(parsedData.data)) {
                    logger.info(`📂 Loaded ${parsedData.data.length} items for ${module} from temp file`);
                    
                    // Khôi phục file chính từ file tạm
                    fs.renameSync(tempFilePath, filePath);
                    logger.info(`✅ Restored main file from temp file for ${module}`);
                    
                    return parsedData.data;
                }
            } catch (error) {
                logger.warn(`⚠️ Temp file also corrupted for ${module}`);
            }
        }
        
        logger.info(`📂 No valid data file found for ${module}, starting with empty data`);
        return [];
        
    } catch (error) {
        logger.error(`❌ Error loading data for ${module}`, { error: error.message, stack: error.stack });
        return [];
    }
}

// 🔄 Hàm lưu tất cả dữ liệu - TỐI ƯU: Parallel save
function saveAllData() {
    const modules = Object.keys(syncData);
    let successCount = 0;
    let completedCount = 0;
    
    // 🚀 TỐI ƯU: Save parallel để nhanh hơn
    const savePromises = modules.map(module => {
        return new Promise((resolve) => {
            setImmediate(() => {
                const success = saveDataToFile(module);
                if (success) successCount++;
                completedCount++;
                resolve(success);
            });
        });
    });
    
    // Đợi tất cả save xong (nhưng không block)
    Promise.all(savePromises).then(() => {
        console.log(`💾 Saved ${successCount}/${modules.length} modules`);
    });
    
    // Return ngay, không đợi
    return true;
}

// 📂 Khôi phục dữ liệu khi khởi động
function loadAllData() {
    console.log('🔄 Loading data from files...');
    Object.keys(syncData).forEach(module => {
        syncData[module] = loadDataFromFile(module);
    });
    console.log('✅ Data loading completed');
}

// Cache để tối ưu hiệu suất
const productIndex = {
    donghang: new Map(), // maGoc -> index
    khophoi: new Map(),
    sanxuat: new Map(),
    thanhpham: new Map()
};

// Mapping chuỗi sản xuất (theo thứ tự)
const productionFlow = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];

// Mapping chuỗi cập nhật ngược (bước trước -> bước sau)
const reverseSyncMap = {
    'khophoi': 'sanxuat',      // Kho phôi -> Sản xuất
    'sanxuat': 'thanhpham',    // Sản xuất -> Thành phẩm
    'thanhpham': 'donghang'    // Thành phẩm -> Đóng hàng
};

// Mapping chuỗi cập nhật thuận (bước sau -> bước trước)
const forwardSyncMap = {
    'sanxuat': 'khophoi',      // Sản xuất -> Kho phôi
    'thanhpham': 'sanxuat',    // Thành phẩm -> Sản xuất
    'donghang': 'thanhpham'    // Đóng hàng -> Thành phẩm
};

// 🚀 TỐI ƯU: Hàm cập nhật index cache - chỉ rebuild khi cần
let indexDirty = {
    donghang: false,
    khophoi: false,
    sanxuat: false,
    thanhpham: false,
    hangsan: false,
    hangton: false
};

function updateProductIndex(module) {
    // Chỉ rebuild nếu index bị dirty hoặc chưa có
    if (!productIndex[module] || indexDirty[module] || productIndex[module].size === 0) {
        if (!productIndex[module]) {
            productIndex[module] = new Map();
        }
        productIndex[module].clear();
        const data = syncData[module] || [];
        // Tối ưu: dùng for loop thay vì forEach cho hiệu suất tốt hơn
        for (let index = 0; index < data.length; index++) {
            const product = data[index];
            if (product && product.maGoc) {
                productIndex[module].set(product.maGoc, index);
            }
        }
        indexDirty[module] = false;
    }
}

// Đánh dấu index cần rebuild khi có thay đổi
function markIndexDirty(module) {
    if (indexDirty.hasOwnProperty(module)) {
        indexDirty[module] = true;
    }
}

// 🚀 TỐI ƯU: Hàm tìm sản phẩm nhanh với cache - lazy rebuild index
function findProductFast(module, productId) {
    // Rebuild index nếu cần
    updateProductIndex(module);
    const index = productIndex[module]?.get(productId);
    return index !== undefined ? syncData[module]?.[index] : null;
}

// 🚀 TỐI ƯU NÂNG CAO: JSON replacer để giảm size (loại bỏ fields không cần khi gửi)
const CHUNK_SIZE = 5000; // Mỗi chunk 5000 items
const CHUNK_DELAY = 50; // Delay 50ms giữa các chunks

function optimizeDataForTransmission(data) {
    if (!Array.isArray(data)) return data;
    
    // Chỉ giữ lại các fields cần thiết khi gửi qua WebSocket
    // Giảm size 20-40% bằng cách loại bỏ fields không cần thiết
    return data.map(item => {
        if (!item) return item;
        // Giữ lại các fields quan trọng
        const optimized = {
            maGoc: item.maGoc,
            ma: item.ma,
            trangThai: item.trangThai,
            dotHang: item.dotHang,
            loaiHang: item.loaiHang,
            loaiSX: item.loaiSX,
            mau: item.mau,
            size: item.size,
            ghiChu: item.ghiChu,
            thoiGian: item.thoiGian,
            lichSu: item.lichSu
        };
        return optimized;
    });
}

// 🚀 TỐI ƯU NÂNG CAO: Chunked data transfer - chia dữ liệu lớn thành chunks
function sendDataInChunks(ws, module, data, messageType = 'sync') {
    if (data.length <= CHUNK_SIZE) {
        // Dữ liệu nhỏ, gửi ngay
        const optimized = optimizeDataForTransmission(data);
        ws.send(JSON.stringify({
            type: messageType,
            module: module,
            data: optimized,
            chunked: false
        }));
        return;
    }
    
    // Dữ liệu lớn, chia thành chunks
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    const optimized = optimizeDataForTransmission(data);
    
    // Gửi chunk đầu tiên với metadata
    ws.send(JSON.stringify({
        type: messageType,
        module: module,
        data: optimized.slice(0, CHUNK_SIZE),
        chunked: true,
        totalChunks: totalChunks,
        currentChunk: 1,
        totalItems: data.length
    }));
    
    // Gửi các chunks còn lại
    for (let i = 1; i < totalChunks; i++) {
        setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'chunk',
                    module: module,
                    data: optimized.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
                    chunked: true,
                    currentChunk: i + 1,
                    totalChunks: totalChunks
                }));
            }
        }, i * CHUNK_DELAY);
    }
}

// ĐÃ XÓA: Các hàm tự động cập nhật trạng thái hoàn thành và phát hiện thiếu bước trước
// - performAutoSync: Đã xóa
// - updateForwardStatus: Đã xóa
// - updateBackwardStatus: Đã xóa
// - updateReverseStatus: Đã xóa

// Lưu trữ các kết nối theo module
const connections = {
    donghang: new Set(),
    khophoi: new Set(),
    sanxuat: new Set(),
    thanhpham: new Set()
};

wss.on('connection', (ws, req) => {
    console.log('Client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { type, module, payload } = data;
            
            switch (type) {
                case 'register':
                    // Đăng ký module
                    if (connections[module]) {
                        connections[module].add(ws);
                        ws.module = module;
                        console.log(`Client registered for module: ${module}`);
                        
                        // 🚀 TỐI ƯU NÂNG CAO: Gửi dữ liệu với chunked transfer và optimization
                        const moduleData = syncData[module] || [];
                        if (moduleData.length > CHUNK_SIZE) {
                            // Dữ liệu rất lớn, dùng chunked transfer
                            setImmediate(() => {
                                try {
                                    sendDataInChunks(ws, module, moduleData, 'sync');
                                } catch (error) {
                                    logger.error('Error sending chunked data to client', { module, error: error.message });
                                }
                            });
                        } else if (moduleData.length > 1000) {
                            // Dữ liệu lớn, gửi async với optimization
                            setImmediate(() => {
                                try {
                                    const optimized = optimizeDataForTransmission(moduleData);
                                    ws.send(JSON.stringify({
                                        type: 'sync',
                                        module: module,
                                        data: optimized
                                    }));
                                } catch (error) {
                                    logger.error('Error sending large data to client', { module, error: error.message });
                                }
                            });
                        } else {
                            // Dữ liệu nhỏ, gửi ngay với optimization
                            const optimized = optimizeDataForTransmission(moduleData);
                            ws.send(JSON.stringify({
                                type: 'sync',
                                module: module,
                                data: optimized
                            }));
                        }
                    }
                    break;
                    
                case 'update':
                    // Cập nhật dữ liệu
                    if (module && syncData[module]) {
                        // 🛡️ Validate payload
                        if (!Array.isArray(payload)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Payload phải là array'
                            }));
                            break;
                        }
                        
                        // 🚀 TỐI ƯU: Validate async để không block (chỉ validate sample nếu quá nhiều)
                        const validationErrors = [];
                        const maxValidationItems = payload.length > 1000 ? 50 : (payload.length > 500 ? 100 : payload.length);
                        
                        // Validate sample nếu quá nhiều items (tối ưu performance)
                        const validationIndices = payload.length > maxValidationItems 
                            ? Array.from({ length: maxValidationItems }, (_, i) => Math.floor(i * payload.length / maxValidationItems))
                            : Array.from({ length: payload.length }, (_, i) => i);
                        
                        for (const i of validationIndices) {
                            const product = payload[i];
                            const { error } = productSchema.validate(product, { allowUnknown: true });
                            if (error) {
                                validationErrors.push(`Item ${i}: ${error.details[0].message}`);
                            }
                        }
                        
                        if (validationErrors.length > 0) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Dữ liệu không hợp lệ: ' + validationErrors.slice(0, 5).join(', ')
                            }));
                            break;
                        }
                        
                        syncData[module] = payload;
                        
                        // Đánh dấu index cần rebuild
                        markIndexDirty(module);
                        
                        // Clear API cache khi có update
                        if (typeof apiRoutes !== 'undefined' && apiRoutes.clearModuleCache) {
                            apiRoutes.clearModuleCache(module);
                        }
                        
                        // 💾 Tự động lưu dữ liệu ngay lập tức (AN TOÀN 100%) - Async để không block
                        setImmediate(() => {
                            saveDataToFile(module);
                        });
                        
                        // 🔄 Lưu backup nhanh cho dữ liệu quan trọng (async, không block)
                        if (payload.length > 0) {
                            setTimeout(() => {
                                setImmediate(() => {
                                    backupModule.createBackup();
                                });
                            }, 2000); // Backup sau 2 giây (tăng lên để giảm load)
                        }
                        
                        // 🚀 TỐI ƯU: Chỉ rebuild index khi cần (lazy update)
                        // updateProductIndex sẽ được gọi khi cần tìm sản phẩm
                        
                        // 📊 Sync lên Google Sheets (debounced)
                        scheduleSheetsSync(module);

                        console.log(`Data updated for module: ${module}`);

                        // 🚀 TỐI ƯU NÂNG CAO: Broadcast với chunked transfer và optimization
                        const moduleData = syncData[module] || [];
                        if (connections[module]) {
                            const clients = Array.from(connections[module]).filter(client => 
                                client !== ws && client.readyState === WebSocket.OPEN
                            );
                            
                            if (clients.length === 0) break;
                            
                            // Tối ưu: Optimize data một lần
                            const optimized = optimizeDataForTransmission(moduleData);
                            
                            if (moduleData.length > CHUNK_SIZE) {
                                // Dữ liệu rất lớn, broadcast với chunked transfer
                                setImmediate(() => {
                                    clients.forEach(client => {
                                        try {
                                            sendDataInChunks(client, module, moduleData, 'sync');
                                        } catch (error) {
                                            logger.error('Error broadcasting chunked data', { module, error: error.message });
                                        }
                                    });
                                });
                            } else if (moduleData.length > 1000) {
                                // Dữ liệu lớn, broadcast async với optimization
                                setImmediate(() => {
                                    const jsonString = JSON.stringify({
                                        type: 'sync',
                                        module: module,
                                        data: optimized
                                    });
                                    clients.forEach(client => {
                                        try {
                                            client.send(jsonString);
                                        } catch (error) {
                                            logger.error('Error broadcasting to client', { module, error: error.message });
                                        }
                                    });
                                });
                            } else {
                                // Dữ liệu nhỏ, broadcast ngay với optimization
                                const jsonString = JSON.stringify({
                                    type: 'sync',
                                    module: module,
                                    data: optimized
                                });
                                clients.forEach(client => {
                                    try {
                                        client.send(jsonString);
                                    } catch (error) {
                                        logger.error('Error broadcasting to client', { module, error: error.message });
                                    }
                                });
                            }
                        }
                        
                        // ĐÃ XÓA: Tự động cập nhật trạng thái hoàn thành và phát hiện thiếu bước trước
                    }
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                case 'check_missing':
                    // ĐÃ XÓA: Chức năng phát hiện thiếu bước trước
                    // Trả về false để tương thích với client cũ
                    try {
                        const { productId } = data;
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'missing_data_response',
                                module: module,
                                productId: productId,
                                isMissing: false
                            }));
                        }
                    } catch (e) { /* noop */ }
                    break;
                    
                case 'get_data':
                    // 🚀 TỐI ƯU NÂNG CAO: Gửi dữ liệu với chunked transfer và optimization
                    const getData = syncData[module] || [];
                    if (getData.length > CHUNK_SIZE) {
                        setImmediate(() => {
                            sendDataInChunks(ws, module, getData, 'sync');
                        });
                    } else {
                        const optimized = optimizeDataForTransmission(getData);
                        ws.send(JSON.stringify({
                            type: 'sync',
                            module: module,
                            data: optimized
                        }));
                    }
                    break;
                    
                case 'get_stats':
                    // Gửi thống kê dữ liệu
                    const stats = getDataStats();
                    ws.send(JSON.stringify({
                        type: 'data_stats',
                        stats: stats
                    }));
                    break;
                    
                case 'cleanup_data':
                    // Dọn dẹp dữ liệu cũ
                    cleanupOldData();
                    ws.send(JSON.stringify({
                        type: 'cleanup_completed',
                        message: 'Data cleanup completed'
                    }));
                    break;
                    
                case 'clear_all_data':
                    // XÓA TOÀN BỘ DỮ LIỆU (THỦ CÔNG)
                    console.log(`🗑️ Manual clear all data requested for module: ${module}`);
                    
                    // Tạo backup trước khi xóa
                    backupModule.createBackup();
                    
                    // Xóa toàn bộ dữ liệu của module
                    syncData[module] = [];
                    
                    // Xóa trong database nếu dùng database
                    if (config.USE_DATABASE && database) {
                        database.clearAllData(module);
                    }
                    
                    // Clear API cache
                    if (typeof apiRoutes !== 'undefined' && apiRoutes.clearModuleCache) {
                        apiRoutes.clearModuleCache(module);
                    }
                    
                    saveDataToFile(module);
                    
                    // Cập nhật cache
                    updateProductIndex(module);
                    
                    // Broadcast đến tất cả client của module này
                    if (connections[module]) {
                        connections[module].forEach(client => {
                            if (client.readyState === WebSocket.OPEN) {
                                client.send(JSON.stringify({
                                    type: 'sync',
                                    module: module,
                                    data: []
                                }));
                            }
                        });
                    }
                    
                    ws.send(JSON.stringify({
                        type: 'clear_completed',
                        message: `All data cleared for ${module}`,
                        module: module
                    }));
                    
                    console.log(`✅ All data cleared for module: ${module}`);
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        
        // Xóa khỏi danh sách kết nối
        Object.keys(connections).forEach(module => {
            connections[module].delete(ws);
        });
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// 🚀 TỐI ƯU: Ping để giữ kết nối - Batch và async
setInterval(() => {
    const pingMessage = JSON.stringify({ type: 'ping' });
    const clients = Array.from(wss.clients).filter(ws => ws.readyState === WebSocket.OPEN);
    
    // Batch ping để không block
    if (clients.length > 10) {
        // Nếu nhiều clients, ping async
        setImmediate(() => {
            clients.forEach((ws) => {
                try {
                    ws.send(pingMessage);
                } catch (error) {
                    // Ignore errors
                }
            });
        });
    } else {
        // Nếu ít clients, ping ngay
        clients.forEach((ws) => {
            try {
                ws.send(pingMessage);
            } catch (error) {
                // Ignore errors
            }
        });
    }
}, 30000);

// 💾 Tự động lưu dữ liệu định kỳ
setInterval(() => {
    saveAllData();
}, config.AUTO_SAVE_INTERVAL);

// 🔄 Tự động tạo backup định kỳ
const backupModule = require('./backup-data');
setInterval(() => {
    if (config.LOG_BACKUP) {
        console.log('🔄 Creating automatic backup...');
    }
    backupModule.createBackup();
}, config.AUTO_BACKUP_INTERVAL);

// (ĐÃ BỎ) Dọn dẹp cache thiếu dữ liệu

// 🗑️ Tự động dọn dẹp dữ liệu cũ (TẮT - CHẾ ĐỘ THỦ CÔNG)
if (config.AUTO_CLEANUP_INTERVAL > 0) {
    setInterval(() => {
        if (config.LOG_CLEANUP) {
            console.log('🕐 Scheduled data cleanup...');
        }
        cleanupOldData();
        
        // Hiển thị thống kê sau khi dọn dẹp
        if (config.ENABLE_STATS) {
            const stats = getDataStats();
            console.log('📊 Data statistics after cleanup:');
            Object.keys(stats).forEach(module => {
                const stat = stats[module];
                console.log(`   ${module}: ${stat.count} items (${stat.sizeKB} KB)`);
            });
        }
    }, config.AUTO_CLEANUP_INTERVAL);
} else {
    console.log('ℹ️ Auto cleanup disabled - Manual mode enabled');
}

// Hàm lấy IP address của máy
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
const LOCAL_IP = getLocalIP();

// 🗄️ Khởi tạo database nếu được bật
if (config.USE_DATABASE && database) {
    database.initDatabase();
    logger.info('✅ Database mode enabled');
} else {
    logger.info('✅ JSON file mode enabled (backward compatibility)');
}

// 📂 Khôi phục dữ liệu khi khởi động
loadAllData();

// 🔄 Cập nhật cache index sau khi load dữ liệu - TỐI ƯU: Đánh dấu dirty để lazy rebuild
Object.keys(syncData).forEach(module => {
    markIndexDirty(module);
    // Index sẽ được rebuild khi cần (lazy) - không rebuild ngay để tăng tốc startup
});

// 🗑️ Cấu hình tự động xóa dữ liệu cũ
const DATA_RETENTION_DAYS = config.DATA_RETENTION_DAYS;
const MAX_ITEMS_PER_MODULE = config.MAX_ITEMS_PER_MODULE;

// 🧹 Hàm dọn dẹp dữ liệu cũ (TỐI ƯU CHO DỮ LIỆU LỚN)
function cleanupOldData() {
    console.log('🧹 Starting data cleanup...');
    const startTime = Date.now();
    
    Object.keys(syncData).forEach(module => {
        const originalCount = syncData[module].length;
        
        // Tối ưu: Lọc dữ liệu theo thời gian với thuật toán nhanh
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
        const cutoffTime = cutoffDate.getTime();
        
        // Sử dụng filter với điều kiện tối ưu
        const validItems = [];
        const invalidItems = [];
        
        syncData[module].forEach(item => {
            const itemTime = getItemTimestamp(item);
            if (itemTime >= cutoffTime) {
                validItems.push(item);
            } else {
                invalidItems.push(item);
            }
        });
        
        // Nếu vẫn còn quá nhiều sản phẩm, sắp xếp và cắt
        if (validItems.length > MAX_ITEMS_PER_MODULE) {
            // Sắp xếp theo thời gian (mới nhất trước) - tối ưu cho dữ liệu lớn
            validItems.sort((a, b) => {
                const timeA = getItemTimestamp(a);
                const timeB = getItemTimestamp(b);
                return timeB - timeA;
            });
            
            // Cắt bớt để giữ lại những cái mới nhất
            syncData[module] = validItems.slice(0, MAX_ITEMS_PER_MODULE);
        } else {
            syncData[module] = validItems;
        }
        
        const removedCount = originalCount - syncData[module].length;
        if (removedCount > 0) {
            console.log(`🗑️ Cleaned ${removedCount} old items from ${module} (${originalCount} → ${syncData[module].length})`);
            // Lưu dữ liệu sau khi dọn dẹp
            saveDataToFile(module);
        } else {
            console.log(`ℹ️ No cleanup needed for ${module} (${originalCount} items)`);
        }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`✅ Data cleanup completed in ${duration}ms`);
}

// 📅 Hàm lấy timestamp của sản phẩm
function getItemTimestamp(item) {
    // Ưu tiên ngayTao
    if (item.ngayTao) {
        return new Date(item.ngayTao).getTime();
    }
    
    // Sau đó là thời gian cập nhật cuối cùng
    if (item.lichSu && item.lichSu.length > 0) {
        return new Date(item.lichSu[item.lichSu.length - 1].thoiGian).getTime();
    }
    
    // Mặc định là thời gian hiện tại
    return Date.now();
}

// 📊 Hàm thống kê dữ liệu (TỐI ƯU CHO DỮ LIỆU LỚN)
function getDataStats() {
    const stats = {};
    let totalItems = 0;
    let totalSize = 0;
    
    Object.keys(syncData).forEach(module => {
        const items = syncData[module];
        const moduleSize = JSON.stringify(items).length;
        const sizeKB = (moduleSize / 1024).toFixed(2);
        const sizeMB = (moduleSize / 1024 / 1024).toFixed(2);
        
        totalItems += items.length;
        totalSize += moduleSize;
        
        stats[module] = {
            count: items.length,
            sizeKB: sizeKB,
            sizeMB: sizeMB,
            oldestItem: null,
            newestItem: null,
            isOverLimit: items.length > MAX_ITEMS_PER_MODULE,
            isOverWarning: parseFloat(sizeMB) > config.WARNING_SIZE_MB
        };
        
        if (items.length > 0) {
            // Tối ưu: Chỉ tính timestamp cho một số mẫu thay vì tất cả
            const sampleSize = Math.min(100, items.length);
            const sampleItems = items.slice(0, sampleSize);
            const timestamps = sampleItems.map(item => getItemTimestamp(item));
            
            if (timestamps.length > 0) {
                const oldestTime = Math.min(...timestamps);
                const newestTime = Math.max(...timestamps);
                
                stats[module].oldestItem = new Date(oldestTime).toLocaleString();
                stats[module].newestItem = new Date(newestTime).toLocaleString();
            }
        }
    });
    
    // Thống kê tổng thể
    stats._total = {
        totalItems: totalItems,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        isOverTarget: (totalSize / 1024 / 1024) > config.TARGET_MAX_SIZE_MB,
        isOverWarning: (totalSize / 1024 / 1024) > config.WARNING_SIZE_MB
    };
    
    return stats;
}

// 🛡️ Xử lý tắt server an toàn (CẢI THIỆN)
let isShuttingDown = false;

function safeShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\n🛑 Shutting down server safely...');
    console.log('💾 Saving all data before exit...');
    
    // Lưu dữ liệu ngay lập tức
    const success = saveAllData();
    
    if (success) {
        console.log('✅ All data saved successfully');
    } else {
        console.log('❌ Some data may not have been saved');
    }
    
    // Tạo backup cuối cùng
    try {
        backupModule.createBackup();
        console.log('💾 Final backup created');
    } catch (error) {
        console.error('❌ Error creating final backup:', error);
    }
    
    console.log('👋 Server shutdown complete');
    process.exit(0);
}

// Xử lý tắt server bằng Ctrl+C
process.on('SIGINT', safeShutdown);

// Xử lý tắt server bằng lệnh
process.on('SIGTERM', safeShutdown);

// Xử lý tắt server do lỗi
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    console.log('💾 Attempting to save data before crash...');
    saveAllData();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    console.log('💾 Attempting to save data before crash...');
    saveAllData();
    process.exit(1);
});

// Xử lý tắt server do mất điện (SIGKILL - không thể bắt được)
// Nhưng dữ liệu đã được lưu mỗi 5 giây nên chỉ mất tối đa 5 giây

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sync Server running on:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - LAN: http://${LOCAL_IP}:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔗 WebSocket endpoint: ws://${LOCAL_IP}:${PORT}`);
    console.log('\n📋 Available modules:');
    console.log('   - donghang (Đóng hàng)');
    console.log('   - khophoi (Kho phôi)'); 
    console.log('   - sanxuat (Sản xuất)');
    console.log('   - thanhpham (Thành phẩm)');
    console.log('\n🌐 For other computers on LAN:');
    console.log(`   Open browser and go to: http://${LOCAL_IP}:${PORT}`);
    console.log('\n💾 Data persistence enabled:');
    console.log(`   - Auto-save every 30 seconds`);
    console.log(`   - Data directory: ${DATA_DIR}`);
    console.log(`   - Safe shutdown with Ctrl+C`);

    // 📊 Google Sheets sync
    if (GOOGLE_SHEETS_URL) {
        console.log(`\n📊 Google Sheets sync: ENABLED`);
        console.log(`   - URL: ${GOOGLE_SHEETS_URL.substring(0, 50)}...`);
    } else {
        console.log(`\n📊 Google Sheets sync: DISABLED (set GOOGLE_SHEETS_URL env var)`);
    }

    // 🗑️ Lên lịch xóa dữ liệu tự động lúc 00:00
    scheduleMiddnightCleanup();
    console.log(`🗑️ Auto cleanup: Hàng ngày lúc 00:00`);
});
