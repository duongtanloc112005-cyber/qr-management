const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ⚙️ Import cấu hình
const config = require('./data-config');

// 📁 Cấu hình lưu trữ dữ liệu
const DATA_DIR = './data';
const DATA_FILES = {
    donghang: path.join(DATA_DIR, 'donghang.json'),
    khophoi: path.join(DATA_DIR, 'khophoi.json'),
    sanxuat: path.join(DATA_DIR, 'sanxuat.json'),
    thanhpham: path.join(DATA_DIR, 'thanhpham.json'),
    hangsan: path.join(DATA_DIR, 'hangsan.json'),
    hangton: path.join(DATA_DIR, 'hangton.json'),
    tonghop: path.join(DATA_DIR, 'tonghop.json'),
    donhang: path.join(DATA_DIR, 'donhang.json')
};

// Tạo thư mục data nếu chưa có
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('📁 Created data directory');
}

// 🌐 Cấu hình cho kết nối ngoài LAN
const EXTERNAL_ACCESS = {
    enabled: process.env.EXTERNAL_ACCESS === 'true' || false,
    allowedOrigins: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'],
    corsEnabled: true
};

// Tạo HTTP server với CORS support
const server = http.createServer((req, res) => {
    // CORS headers cho kết nối ngoài
    if (EXTERNAL_ACCESS.corsEnabled) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Xử lý favicon.ico để tránh lỗi 404
    if (req.url === '/favicon.ico') {
        res.writeHead(204); // 204 No Content - không trả về gì
        res.end();
        return;
    }
    
    // API quản lý users
    const USERS_FILE = './users.json';
    
    // 🔐 API Authentication endpoints
    if (req.url === '/api/auth/login' || req.url === '/api/auth/check') {
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', async () => {
                try {
                    const authModule = require('./auth-server');
                    const data = JSON.parse(body);
                    const { username, password, moduleName } = data;
                    
                    if (!username || !password || !moduleName) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Thiếu thông tin đăng nhập' }));
                        return;
                    }
                    
                    const result = await authModule.authenticate(username, password, moduleName);
                    
                    if (result.success) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: true, 
                            user: result.user 
                        }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            success: false, 
                            error: result.error || 'Đăng nhập thất bại' 
                        }));
                    }
                } catch (error) {
                    console.error('❌ Auth error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Lỗi server' 
                    }));
                }
            });
            return;
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }
    }
    
    // API endpoints cho dữ liệu module (GET/PUT /api/{module})
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/users') && !req.url.startsWith('/api/auth')) {
        const moduleName = req.url.replace('/api/', '').split('?')[0];
        
        // Kiểm tra module hợp lệ
        const validModules = ['donghang', 'khophoi', 'sanxuat', 'thanhpham', 'hangsan', 'hangton', 'tonghop', 'donhang'];
        if (validModules.includes(moduleName)) {
            const dataFile = DATA_FILES[moduleName];
            
            // GET - Lấy dữ liệu module
            if (req.method === 'GET') {
                try {
                    if (fs.existsSync(dataFile)) {
                        const fileContent = fs.readFileSync(dataFile, 'utf8');
                        let parsedData;
                        try {
                            parsedData = JSON.parse(fileContent);
                        } catch (parseError) {
                            console.error(`❌ Error parsing ${moduleName} data file:`, parseError);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ timestamp: new Date().toISOString(), data: [] }));
                            return;
                        }
                        
                        // Nếu file có format {timestamp, data}, trả về nguyên file
                        // Nếu file là mảng, wrap thành {timestamp, data}
                        if (Array.isArray(parsedData)) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ timestamp: new Date().toISOString(), data: parsedData }));
                        } else if (parsedData && parsedData.data && Array.isArray(parsedData.data)) {
                            // File có format {timestamp, data}
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(fileContent);
                        } else {
                            // Format không đúng, trả về mảng rỗng
                            console.warn(`⚠️ Invalid data format for ${moduleName}, returning empty array`);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ timestamp: new Date().toISOString(), data: [] }));
                        }
                    } else {
                        // Nếu file chưa tồn tại, trả về format {timestamp, data: []}
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ timestamp: new Date().toISOString(), data: [] }));
                    }
                } catch (error) {
                    console.error(`❌ Error reading ${moduleName} data:`, error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Cannot read module data', message: error.message }));
                }
                return;
            }
            
            // PUT - Cập nhật dữ liệu module
            if (req.method === 'PUT') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        const data = JSON.parse(body);
                        fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (error) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cannot write module data: ' + error.message }));
                    }
                });
                return;
            }
            
            // Method not allowed
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Module not found' }));
            return;
        }
    }
    
    if (req.url.startsWith('/api/users')) {
        if (req.method === 'GET') {
            fs.readFile(USERS_FILE, (error, content) => {
                if (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Cannot read users file' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(content);
                }
            });
            return;
        }
        
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const newUser = JSON.parse(body);
                    fs.readFile(USERS_FILE, (error, content) => {
                        if (error) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Cannot read users file' }));
                            return;
                        }
                        const users = JSON.parse(content);
                        // Kiểm tra username đã tồn tại
                        if (users.find(u => u.username === newUser.username)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Username already exists' }));
                            return;
                        }
                        users.push(newUser);
                        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (error) => {
                            if (error) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Cannot write users file' }));
                            } else {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, user: newUser }));
                            }
                        });
                    });
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
        
        if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const updatedUser = JSON.parse(body);
                    fs.readFile(USERS_FILE, (error, content) => {
                        if (error) {
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Cannot read users file' }));
                            return;
                        }
                        const users = JSON.parse(content);
                        const index = users.findIndex(u => u.username === updatedUser.username);
                        if (index === -1) {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'User not found' }));
                            return;
                        }
                        users[index] = updatedUser;
                        fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), (error) => {
                            if (error) {
                                res.writeHead(500, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'Cannot write users file' }));
                            } else {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ success: true, user: updatedUser }));
                            }
                        });
                    });
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                }
            });
            return;
        }
        
        if (req.method === 'DELETE') {
            const urlParts = req.url.split('/');
            const username = urlParts[urlParts.length - 1];
            fs.readFile(USERS_FILE, (error, content) => {
                if (error) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Cannot read users file' }));
                    return;
                }
                const users = JSON.parse(content);
                const filteredUsers = users.filter(u => u.username !== username);
                if (users.length === filteredUsers.length) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'User not found' }));
                    return;
                }
                fs.writeFile(USERS_FILE, JSON.stringify(filteredUsers, null, 2), (error) => {
                    if (error) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Cannot write users file' }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    }
                });
            });
            return;
        }
    }

    let filePath = '.' + req.url;
    if (filePath === './') filePath = './html/index.html';
    
    // Chuẩn hóa path: xử lý các trường hợp URL sai định dạng
    // Ví dụ: /TongHop/html/TongHop.html -> /html/TongHop.html
    // Hoặc: /tonghop.html -> /html/TongHop.html
    if (req.url.includes('.html')) {
        // Lấy tên file từ URL (bỏ query string)
        const urlWithoutQuery = req.url.split('?')[0];
        const fileName = path.basename(urlWithoutQuery);
        
        // Kiểm tra nếu path có dạng /ModuleName/html/ModuleName.html
        const pathParts = urlWithoutQuery.split('/').filter(p => p);
        if (pathParts.length === 3 && pathParts[1] === 'html' && pathParts[2].endsWith('.html')) {
            // Path đúng: /html/ModuleName.html
            filePath = './html/' + pathParts[2];
        } else if (pathParts.length === 2 && pathParts[0] !== 'html' && pathParts[1].endsWith('.html')) {
            // Path có dạng /ModuleName/ModuleName.html -> sửa thành /html/ModuleName.html
            filePath = './html/' + pathParts[1];
        } else if (pathParts.length === 1 && pathParts[0].endsWith('.html')) {
            // Path đơn giản: /ModuleName.html -> /html/ModuleName.html
            filePath = './html/' + pathParts[0];
        }
    }
    
    // Serve các file JSON từ thư mục data/ trước
    if (req.url.startsWith('/data/')) {
        // Lấy tên file từ URL (bỏ query string)
        const urlWithoutQuery = req.url.split('?')[0];
        const fileName = path.basename(urlWithoutQuery);
        filePath = path.join(DATA_DIR, fileName);
        console.log(`📄 Serving JSON file: ${req.url} -> ${filePath}`);
    }
    // Serve các file JS từ root trước
    else if (req.url === '/users.json') {
        filePath = './users.json';
    }
    else if (req.url === '/auth.js' || req.url === '/html/auth.js') {
        filePath = './auth.js';
    }
    else if (req.url === '/offline-storage.js' || req.url.endsWith('/offline-storage.js')) {
        filePath = './offline-storage.js';
    }
    else if (req.url === '/data-recovery.js' || req.url.endsWith('/data-recovery.js')) {
        filePath = './data-recovery.js';
    }
    else if (req.url === '/offline-integration.js' || req.url.endsWith('/offline-integration.js')) {
        filePath = './offline-integration.js';
    }
    // Nếu là file HTML, tìm trong thư mục html (trừ khi đã có đường dẫn html/)
    else if (filePath.endsWith('.html') && !filePath.includes('/html/') && !filePath.startsWith('./html/')) {
        filePath = './html' + req.url;
    }
    
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json'
    };
    
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Log để debug
    if (req.url.includes('.html') || req.url.includes('.js')) {
        console.log(`📄 Request: ${req.url} -> ${filePath}`);
    }
    
    // Hàm tìm file với case-insensitive (hỗ trợ cả Windows và Linux)
    function findFileCaseInsensitive(targetPath) {
        // Thử đọc file trực tiếp trước
        if (fs.existsSync(targetPath)) {
            return targetPath;
        }
        
        // Nếu không tìm thấy, thử tìm file trong thư mục html với case-insensitive
        if (targetPath.includes('html/') || targetPath.startsWith('./html/')) {
            const dirPath = path.dirname(targetPath);
            const fileName = path.basename(targetPath);
            
            try {
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);
                    // Tìm file với tên giống nhau (case-insensitive)
                    const foundFile = files.find(f => f.toLowerCase() === fileName.toLowerCase());
                    if (foundFile) {
                        return path.join(dirPath, foundFile);
                    }
                }
            } catch (e) {
                // Ignore errors
            }
        }
        
        return null;
    }
    
    // Tìm file với case-insensitive
    const actualFilePath = findFileCaseInsensitive(filePath);
    if (actualFilePath && actualFilePath !== filePath) {
        filePath = actualFilePath;
        console.log(`📝 Fixed path: ${filePath}`);
    }
    
    // Hàm tìm file JSON trong thư mục data với case-insensitive
    function findJsonFileCaseInsensitive(targetPath, dataDir) {
        if (fs.existsSync(targetPath)) {
            return targetPath;
        }
        
        try {
            if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir);
                const fileName = path.basename(targetPath);
                const foundFile = files.find(f => f.toLowerCase() === fileName.toLowerCase());
                if (foundFile) {
                    return path.join(dataDir, foundFile);
                }
            }
        } catch (e) {
            // Ignore errors
        }
        
        return null;
    }
    
    // Nếu là file JSON từ /data/, thử tìm với case-insensitive
    if (req.url.startsWith('/data/') && !fs.existsSync(filePath)) {
        const altPath = findJsonFileCaseInsensitive(filePath, DATA_DIR);
        if (altPath) {
            filePath = altPath;
            console.log(`📝 Fixed JSON path: ${filePath}`);
        }
    }
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            console.error(`❌ Error serving ${req.url}:`, error.code);
            if (error.code === 'ENOENT') {
                // Thử tìm lại với case-insensitive cho file JSON từ /data/
                if (req.url.startsWith('/data/')) {
                    const altPath = findJsonFileCaseInsensitive(filePath, DATA_DIR);
                    if (altPath && fs.existsSync(altPath)) {
                        fs.readFile(altPath, (err, cont) => {
                            if (!err) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(cont, 'utf-8');
                            } else {
                                res.writeHead(404, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: 'File not found', path: req.url }), 'utf-8');
                            }
                        });
                        return;
                    }
                }
                
                // Thử tìm lại với case-insensitive cho HTML files
                const htmlDir = './html';
                if (fs.existsSync(htmlDir) && req.url.includes('.html')) {
                    try {
                        const files = fs.readdirSync(htmlDir);
                        const urlFileName = path.basename(req.url.split('?')[0]);
                        const foundFile = files.find(f => f.toLowerCase() === urlFileName.toLowerCase());
                        if (foundFile) {
                            const correctPath = path.join(htmlDir, foundFile);
                            console.log(`📝 Trying alternative path: ${correctPath}`);
                            fs.readFile(correctPath, (err, cont) => {
                                if (!err) {
                                    res.writeHead(200, { 'Content-Type': contentType });
                                    res.end(cont, 'utf-8');
                                } else {
                                    res.writeHead(404, { 'Content-Type': 'text/html' });
                                    res.end(`<h1>404 - File Not Found</h1><p>Requested: ${req.url}</p><p>Path: ${filePath}</p>`, 'utf-8');
                                }
                            });
                            return;
                        }
                    } catch (e) {
                        // Ignore
                    }
                }
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end(`<h1>404 - File Not Found</h1><p>Requested: ${req.url}</p><p>Path: ${filePath}</p><p>Available files: ${fs.existsSync('./html') ? fs.readdirSync('./html').join(', ') : 'html dir not found'}</p>`, 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Tạo WebSocket server với CORS support
const wss = new WebSocket.Server({ 
    server,
    verifyClient: (info) => {
        // Kiểm tra origin nếu có cấu hình
        if (EXTERNAL_ACCESS.enabled && EXTERNAL_ACCESS.allowedOrigins[0] !== '*') {
            const origin = info.origin;
            return EXTERNAL_ACCESS.allowedOrigins.includes(origin);
        }
        return true;
    }
});

// Lưu trữ dữ liệu đồng bộ
const syncData = {
    donghang: [],
    khophoi: [],
    sanxuat: [],
    thanhpham: [],
    hangsan: [],
    hangton: [],
    tonghop: [],
    donhang: []
};

// 💾 Hàm lưu dữ liệu vào file (AN TOÀN 100%)
function saveDataToFile(module) {
    try {
        const filePath = DATA_FILES[module];
        if (!filePath) return false;
        
        const dataToSave = {
            timestamp: new Date().toISOString(),
            data: syncData[module] || []
        };
        
        // Lưu an toàn: tạo file tạm trước, sau đó rename
        const tempFilePath = filePath + '.tmp';
        const dataString = JSON.stringify(dataToSave, null, 2);
        fs.writeFileSync(tempFilePath, dataString, 'utf8');
        fs.renameSync(tempFilePath, filePath);
        
        const dataLength = Array.isArray(dataToSave.data) ? dataToSave.data.length : 0;
        console.log(`💾 Saved data for ${module} to ${filePath}: ${dataLength} items`);
        return true;
    } catch (error) {
        console.error(`❌ Error saving data for ${module}:`, error);
        return false;
    }
}

// 📂 Hàm tải dữ liệu từ file (AN TOÀN 100%)
function loadDataFromFile(module) {
    try {
        const filePath = DATA_FILES[module];
        const tempFilePath = filePath + '.tmp';
        
        // Kiểm tra file chính trước
        if (fs.existsSync(filePath)) {
            try {
                const fileContent = fs.readFileSync(filePath, 'utf8');
                const parsedData = JSON.parse(fileContent);
                
                if (parsedData.data && Array.isArray(parsedData.data)) {
                    console.log(`📂 Loaded ${parsedData.data.length} items for ${module} from ${filePath}`);
                    console.log(`📅 Last saved: ${parsedData.timestamp || 'Unknown'}`);
                    return parsedData.data;
                }
            } catch (error) {
                console.log(`⚠️ Main file corrupted for ${module}, checking temp file...`);
            }
        }
        
        // Nếu file chính không tồn tại hoặc bị lỗi, kiểm tra file tạm
        if (fs.existsSync(tempFilePath)) {
            try {
                const tempContent = fs.readFileSync(tempFilePath, 'utf8');
                const parsedData = JSON.parse(tempContent);
                
                if (parsedData.data && Array.isArray(parsedData.data)) {
                    console.log(`📂 Loaded ${parsedData.data.length} items for ${module} from temp file`);
                    console.log(`📅 Last saved: ${parsedData.timestamp || 'Unknown'}`);
                    
                    // Khôi phục file chính từ file tạm
                    fs.renameSync(tempFilePath, filePath);
                    console.log(`✅ Restored main file from temp file for ${module}`);
                    
                    return parsedData.data;
                }
            } catch (error) {
                console.log(`⚠️ Temp file also corrupted for ${module}`);
            }
        }
        
        console.log(`📂 No valid data file found for ${module}, starting with empty data`);
        return [];
        
    } catch (error) {
        console.error(`❌ Error loading data for ${module}:`, error);
        return [];
    }
}

// 🔄 Hàm lưu tất cả dữ liệu
function saveAllData() {
    let successCount = 0;
    Object.keys(syncData).forEach(module => {
        if (saveDataToFile(module)) {
            successCount++;
        }
    });
    console.log(`💾 Saved ${successCount}/${Object.keys(syncData).length} modules`);
    return successCount === Object.keys(syncData).length;
}

// 📂 Khôi phục dữ liệu khi khởi động
function loadAllData() {
    console.log('🔄 Loading data from files...');
    Object.keys(syncData).forEach(module => {
        const loadedData = loadDataFromFile(module);
        syncData[module] = loadedData;
        const dataLength = Array.isArray(loadedData) ? loadedData.length : 0;
        if (dataLength > 0) {
            console.log(`   ✅ ${module}: ${dataLength} items loaded`);
        } else {
            console.log(`   ⚠️ ${module}: No data found (empty file or file not found)`);
        }
    });
    console.log('✅ Data loading completed');
}

// Cache để tối ưu hiệu suất
const productIndex = {
    donghang: new Map(),
    khophoi: new Map(),
    sanxuat: new Map(),
    thanhpham: new Map(),
    hangsan: new Map(),
    hangton: new Map(),
    tonghop: new Map(),
    donhang: new Map()
};

// (ĐÃ BỎ) Cache kiểm tra thiếu dữ liệu

// Mapping chuỗi sản xuất
const productionFlow = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];

// Mapping chuỗi cập nhật ngược
const reverseSyncMap = {
    'khophoi': 'sanxuat',
    'sanxuat': 'thanhpham',
    'thanhpham': 'donghang'
};

// Mapping chuỗi cập nhật thuận
const forwardSyncMap = {
    'sanxuat': 'khophoi',
    'thanhpham': 'sanxuat',
    'donghang': 'thanhpham'
};

// Hàm cập nhật index cache
function updateProductIndex(module) {
    productIndex[module].clear();
    syncData[module].forEach((product, index) => {
        if (product.maGoc) {
            productIndex[module].set(product.maGoc, index);
        }
    });
}

// Hàm tìm sản phẩm nhanh với cache
function findProductFast(module, productId) {
    const index = productIndex[module].get(productId);
    return index !== undefined ? syncData[module][index] : null;
}

// (ĐÃ BỎ) Hàm kiểm tra thiếu dữ liệu (đơn giản hóa server)

// Lưu trữ các kết nối theo module
const connections = {
    donghang: new Set(),
    khophoi: new Set(),
    sanxuat: new Set(),
    thanhpham: new Set(),
    hangsan: new Set(),
    hangton: new Set(),
    tonghop: new Set(),
    donhang: new Set()
};

wss.on('connection', (ws, req) => {
    const clientIP = req.connection.remoteAddress;
    console.log(`Client connected from: ${clientIP}`);
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { type, module, payload } = data;
            
            console.log(`📨 Received message from ${clientIP}: type=${type}, module=${module}, payload.length=${Array.isArray(payload) ? payload.length : 'N/A'}`);
            
            switch (type) {
                case 'register':
                    if (connections[module]) {
                        connections[module].add(ws);
                        ws.module = module;
                        console.log(`Client registered for module: ${module} from ${clientIP}`);
                        
                        ws.send(JSON.stringify({
                            type: 'sync',
                            module: module,
                            data: syncData[module]
                        }));
                    }
                    break;
                    
                case 'update':
                    if (!module) {
                        console.error(`❌ Update request missing module name from ${clientIP}`);
                        break;
                    }
                    if (syncData[module] === undefined) {
                        console.error(`❌ Update request for unknown module '${module}' from ${clientIP}`);
                        break;
                    }
                    if (module && syncData[module] !== undefined) {
                        // Logic đặc biệt: Khi Đóng hàng thêm/update sản phẩm, tự động cập nhật "Hoàn thành" cho Hàng Sẵn và Hàng Tồn
                        // Lưu dữ liệu cũ trước khi cập nhật (để sử dụng sau)
                        const oldDataForDonghang = module === 'donghang' ? [...syncData[module]] : null;
                        
                        const payloadLength = Array.isArray(payload) ? payload.length : 0;
                        const oldLength = Array.isArray(syncData[module]) ? syncData[module].length : 0;
                        console.log(`📥 Received update for ${module} from ${clientIP}: ${payloadLength} items (old: ${oldLength} items)`);
                        
                        syncData[module] = payload;
                        
                        // Lưu vào file ngay lập tức
                        const saveSuccess = saveDataToFile(module);
                        if (saveSuccess) {
                            console.log(`✅ Successfully saved ${module} data to file (${payloadLength} items)`);
                        } else {
                            console.error(`❌ Failed to save ${module} data to file!`);
                        }
                        
                        updateProductIndex(module);
                        
                        // (ĐÃ BỎ) Xóa cache thiếu dữ liệu
                        
                        console.log(`📥 Data updated for module: ${module} from ${clientIP} (${Array.isArray(payload) ? payload.length : 0} items)`);
                        
                        // Hàm cập nhật hoàn thành ngược cho từng bước flow (giữ đúng trạng thái hoàn thành từng bộ phận)
                        function autoCompletePrevStep(module, productId) {
                            // Quy tắc flow: khophoi->sanxuat->thanhpham->donghang
                            const prevFlow = {
                                'sanxuat': 'khophoi',
                                'thanhpham': 'sanxuat',
                                'donghang': 'thanhpham'
                            };
                            const prevModule = prevFlow[module];
                            if (!prevModule) return;
                            
                            // Kiểm tra sản phẩm có THỰC SỰ tồn tại ở module hiện tại không (bất kỳ trạng thái nào)
                            const currentProduct = findProductFast(module, productId);
                            if (!currentProduct) {
                                return; // Không đánh dấu hoàn thành nếu sản phẩm chưa được thêm vào module sau
                            }
                            
                            // Đánh dấu hoàn thành khi sản phẩm đã được THÊM vào module sau (bất kỳ trạng thái nào)
                            const product = findProductFast(prevModule, productId);
                            if (product && product.trangThai !== 'Hoàn thành') {
                                product.trangThai = 'Hoàn thành';
                                product.locked = true;
                                if (!product.lichSu) product.lichSu = [];
                                product.lichSu.push({
                                    thoiGian: new Date().toLocaleString(),
                                    trangThai: 'Hoàn thành',
                                    note: `Tự động cập nhật khi sản phẩm đã được thêm vào ${module}`
                                });
                                updateProductIndex(prevModule);
                                saveDataToFile(prevModule);
                                if (connections[prevModule]) {
                                    connections[prevModule].forEach(client => {
                                        if (client.readyState === 1) {
                                            client.send(JSON.stringify({
                                                type: 'sync',
                                                module: prevModule,
                                                data: syncData[prevModule]
                                            }));
                                        }
                                    });
                                }
                                console.log(`✅ Tự động hoàn thành ${prevModule} cho sản phẩm ${productId} vì đã được thêm vào ${module}`);
                            }
                        }

                        if (["sanxuat", "thanhpham", "donghang"].includes(module)) {
                            if (Array.isArray(payload)) {
                                payload.forEach(product => {
                                    if (product && product.maGoc) autoCompletePrevStep(module, product.maGoc);
                                });
                            }
                        }
                        
                        // Logic đặc biệt: Khi Đóng hàng thêm/update sản phẩm, tự động cập nhật "Hoàn thành" cho Hàng Sẵn và Hàng Tồn
                        if (module === 'donghang') {
                            
                            // Lấy danh sách sản phẩm trong payload (sản phẩm mới được thêm/cập nhật)
                            const productsInPayload = new Set();
                            if (Array.isArray(data.payload)) {
                                data.payload.forEach(product => {
                                    if (product.maGoc) {
                                        productsInPayload.add(product.maGoc);
                                    }
                                });
                            }
                            
                            // Tự động cập nhật trạng thái "Hoàn thành" cho Hàng Sẵn và Hàng Tồn
                            const modulesToComplete = ['hangsan', 'hangton'];
                            modulesToComplete.forEach(sourceModule => {
                                if (!syncData[sourceModule]) return;
                                
                                let hasChanges = false;
                                
                                productsInPayload.forEach(productId => {
                                    const sourceProduct = findProductFast(sourceModule, productId);
                                    if (sourceProduct && sourceProduct.trangThai !== 'Hoàn thành') {
                                        sourceProduct.trangThai = 'Hoàn thành';
                                        sourceProduct.locked = true;
                                        
                                        if (!sourceProduct.lichSu) sourceProduct.lichSu = [];
                                        sourceProduct.lichSu.push({
                                            thoiGian: new Date().toLocaleString(),
                                            trangThai: 'Hoàn thành',
                                            note: `Tự động cập nhật - Sản phẩm đã được thêm vào Đóng hàng`
                                        });
                                        
                                        hasChanges = true;
                                        console.log(`✅ Tự động hoàn thành ${sourceModule} cho sản phẩm ${productId} (đã thêm vào Đóng hàng)`);
                                    }
                                });
                                
                                // Cập nhật index và lưu file nếu có thay đổi
                                if (hasChanges) {
                                    updateProductIndex(sourceModule);
                                    saveDataToFile(sourceModule);
                                    
                                    // Broadcast đến clients của module nguồn
                                    if (connections[sourceModule]) {
                                        connections[sourceModule].forEach(client => {
                                            if (client.readyState === WebSocket.OPEN) {
                                                client.send(JSON.stringify({
                                                    type: 'sync',
                                                    module: sourceModule,
                                                    data: syncData[sourceModule]
                                                }));
                                            }
                                        });
                                    }
                                }
                            });
                        }
                        
                        // Broadcast đến TẤT CẢ clients đã đăng ký với module này (kể cả client gửi update)
                        // Điều này đảm bảo tất cả clients nhận được dữ liệu mới nhất
                        if (connections[module]) {
                            const clientCount = connections[module].size;
                            let broadcastCount = 0;
                            connections[module].forEach(client => {
                                if (client.readyState === WebSocket.OPEN) {
                                    try {
                                        client.send(JSON.stringify({
                                            type: 'sync',
                                            module: module,
                                            data: syncData[module]
                                        }));
                                        broadcastCount++;
                                    } catch (error) {
                                        console.error(`Error broadcasting to client for module ${module}:`, error);
                                    }
                                }
                            });
                            console.log(`📡 Broadcasted ${module} update to ${broadcastCount}/${clientCount} clients (${Array.isArray(syncData[module]) ? syncData[module].length : 0} items)`);
                        }
                    }
                    break;
                    
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                    
                case 'check_missing':
                    // TẮT LOGIC KIỂM TRA THIẾU BƯỚC TRƯỚC TRÊN SERVER NGOÀI
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
                    const moduleData = syncData[module] || [];
                    const dataLength = Array.isArray(moduleData) ? moduleData.length : 0;
                    console.log(`📤 Sending data to client for module ${module}: ${dataLength} items from ${clientIP}`);
                    ws.send(JSON.stringify({
                        type: 'sync',
                        module: module,
                        data: moduleData
                    }));
                    break;
                    
                case 'get_stats':
                    const stats = getDataStats();
                    ws.send(JSON.stringify({
                        type: 'data_stats',
                        stats: stats
                    }));
                    break;
            }
        } catch (error) {
            console.error(`❌ Error processing message from ${clientIP}:`, error);
            console.error('Message content:', message.toString().substring(0, 200));
            if (error.stack) {
                console.error('Stack trace:', error.stack);
            }
        }
    });
    
    ws.on('close', () => {
        console.log(`Client disconnected from: ${clientIP}`);
        
        Object.keys(connections).forEach(module => {
            connections[module].delete(ws);
        });
    });
    
    ws.on('error', (error) => {
        console.error(`WebSocket error from ${clientIP}:`, error);
    });
});

// Ping để giữ kết nối
setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    });
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

// Hàm lấy IP public (nếu có)
async function getPublicIP() {
    try {
        const https = require('https');
        return new Promise((resolve, reject) => {
            https.get('https://api.ipify.org', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve(data.trim()));
            }).on('error', reject);
        });
    } catch (error) {
        return 'Unknown';
    }
}

const PORT = process.env.PORT || 8080;
const LOCAL_IP = getLocalIP();

// 📂 Khôi phục dữ liệu khi khởi động
loadAllData();

// 🔄 Cập nhật cache index sau khi load dữ liệu
Object.keys(syncData).forEach(module => {
    updateProductIndex(module);
});

// Hàm thống kê dữ liệu
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
            sizeMB: sizeMB
        };
    });
    
    stats._total = {
        totalItems: totalItems,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
    
    return stats;
}

// 🛡️ Xử lý tắt server an toàn
let isShuttingDown = false;

function safeShutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log('\n🛑 Shutting down server safely...');
    console.log('💾 Saving all data before exit...');
    
    const success = saveAllData();
    
    if (success) {
        console.log('✅ All data saved successfully');
    } else {
        console.log('❌ Some data may not have been saved');
    }
    
    try {
        backupModule.createBackup();
        console.log('💾 Final backup created');
    } catch (error) {
        console.error('❌ Error creating final backup:', error);
    }
    
    console.log('👋 Server shutdown complete');
    process.exit(0);
}

process.on('SIGINT', safeShutdown);
process.on('SIGTERM', safeShutdown);
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

server.listen(PORT, '0.0.0.0', async () => {
    const publicIP = await getPublicIP();
    
    console.log(`🚀 QR Management Server running on:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - LAN: http://${LOCAL_IP}:${PORT}`);
    if (publicIP !== 'Unknown') {
        console.log(`   - Internet: http://${publicIP}:${PORT} (if port forwarded)`);
    }
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🔗 WebSocket endpoint: ws://${LOCAL_IP}:${PORT}`);
    console.log(`🌐 External access: ${EXTERNAL_ACCESS.enabled ? 'ENABLED' : 'DISABLED'}`);
    
    console.log('\n📋 Available modules:');
    console.log('   - donghang (Đóng hàng)');
    console.log('   - khophoi (Kho phôi)'); 
    console.log('   - sanxuat (Sản xuất)');
    console.log('   - thanhpham (Thành phẩm)');
    console.log('   - hangsan (Hàng Sẵn)');
    console.log('   - hangton (Hàng Tồn)');
    console.log('   - tonghop (Tổng Hợp)');
    console.log('   - donhang (Đơn Hàng)');
    
    console.log('\n🌐 For external access:');
    console.log('   1. Port Forwarding: Configure router to forward port 3000');
    console.log('   2. Ngrok: ngrok http 3000');
    console.log('   3. Cloudflare Tunnel: cloudflared tunnel --url http://localhost:3000');
    console.log('   4. VPS: Deploy to cloud server');
    
    console.log('\n💾 Data persistence enabled:');
    console.log(`   - Auto-save every ${config.AUTO_SAVE_INTERVAL/1000} seconds`);
    console.log(`   - Data directory: ${DATA_DIR}`);
    console.log(`   - Safe shutdown with Ctrl+C`);
});
















