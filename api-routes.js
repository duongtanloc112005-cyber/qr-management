// 🚀 REST API Routes - Tối ưu hiệu suất, không lag
const express = require('express');
const router = express.Router();
const Joi = require('joi');
const logger = require('./logger');

// Import modules
let syncData, database, config, productSchema;

// Initialize với dependencies
function initRoutes(dependencies) {
    syncData = dependencies.syncData;
    database = dependencies.database;
    config = dependencies.config;
    productSchema = dependencies.productSchema;
}

// 🗄️ Simple in-memory cache (có thể nâng cấp lên Redis sau)
const cache = new Map();
const CACHE_TTL = 5000; // 5 giây
const MAX_CACHE_SIZE = 500; // Giới hạn cache size để tránh memory leak

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCache(key, data) {
    // 🚀 TỐI ƯU: Tự động cleanup cache cũ nếu quá lớn
    if (cache.size >= MAX_CACHE_SIZE) {
        // Xóa 20% cache entries cũ nhất
        const entriesToDelete = Math.floor(MAX_CACHE_SIZE * 0.2);
        const sortedEntries = Array.from(cache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, entriesToDelete);
        sortedEntries.forEach(([key]) => cache.delete(key));
    }
    
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
}

// Clear cache khi có update
function clearModuleCache(module) {
    const keysToDelete = [];
    for (const key of cache.keys()) {
        if (key.startsWith(`module:${module}:`)) {
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => cache.delete(key));
}

// 🚀 TỐI ƯU: Tự động cleanup cache cũ định kỳ
setInterval(() => {
    const now = Date.now();
    const keysToDelete = [];
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL * 2) { // Xóa cache cũ hơn 2x TTL
            keysToDelete.push(key);
        }
    }
    keysToDelete.forEach(key => cache.delete(key));
    if (keysToDelete.length > 0) {
        logger.debug(`🧹 Cleaned ${keysToDelete.length} expired cache entries`);
    }
}, 30000); // Cleanup mỗi 30 giây

// 📋 Validation schemas
const paginationSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(100),
    sortBy: Joi.string().valid('maGoc', 'trangThai', 'ngayTao').default('maGoc'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    search: Joi.string().max(200).allow(''),
    trangThai: Joi.string().allow('')
});

// GET /api/:module - Lấy dữ liệu với pagination và filtering
router.get('/:module', async (req, res) => {
    try {
        const { module } = req.params;
        
        // Validate module (kiểm tra config đã được init chưa)
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ 
                success: false, 
                error: `Module không hợp lệ. Modules hợp lệ: ${config && config.MODULES ? config.MODULES.join(', ') : 'N/A'}` 
            });
        }
        
        // Validate query params
        const { error, value } = paginationSchema.validate(req.query);
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: 'Query parameters không hợp lệ: ' + error.details[0].message 
            });
        }
        
        const { page, limit, sortBy, sortOrder, search, trangThai } = value;
        
        // Cache key
        const cacheKey = `module:${module}:page:${page}:limit:${limit}:sort:${sortBy}:${sortOrder}:search:${search}:status:${trangThai}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Lấy dữ liệu
        let data = syncData[module] || [];
        
        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            data = data.filter(item => 
                (item.maGoc && item.maGoc.toLowerCase().includes(searchLower)) ||
                (item.ghiChu && item.ghiChu.toLowerCase().includes(searchLower)) ||
                (item.dotHang && item.dotHang.toLowerCase().includes(searchLower))
            );
        }
        
        // Filter by status
        if (trangThai) {
            data = data.filter(item => item.trangThai === trangThai);
        }
        
        // Sort
        data.sort((a, b) => {
            let aVal = a[sortBy] || '';
            let bVal = b[sortBy] || '';
            
            if (sortBy === 'ngayTao' || sortBy.includes('thoiGian')) {
                aVal = new Date(aVal).getTime() || 0;
                bVal = new Date(bVal).getTime() || 0;
            } else {
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();
            }
            
            if (sortOrder === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        // Pagination
        const total = data.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedData = data.slice(startIndex, endIndex);
        
        const result = {
            success: true,
            data: paginatedData,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
        
        // Cache result
        setCache(cacheKey, result);
        
        res.json(result);
    } catch (error) {
        logger.error('API GET error', { error: error.message, stack: error.stack, module: req.params.module });
        res.status(500).json({ 
            success: false, 
            error: 'Lỗi server' 
        });
    }
});

// GET /api/:module/:maGoc - Lấy một sản phẩm cụ thể
router.get('/:module/:maGoc', async (req, res) => {
    try {
        const { module, maGoc } = req.params;
        
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ success: false, error: 'Module không hợp lệ' });
        }
        
        // Cache key
        const cacheKey = `module:${module}:item:${maGoc}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        // Tìm sản phẩm
        const data = syncData[module] || [];
        const product = data.find(item => item.maGoc === maGoc);
        
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                error: 'Không tìm thấy sản phẩm' 
            });
        }
        
        const result = { success: true, data: product };
        setCache(cacheKey, result);
        
        res.json(result);
    } catch (error) {
        logger.error('API GET item error', { error: error.message, module: req.params.module });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// POST /api/:module - Tạo mới sản phẩm
router.post('/:module', async (req, res) => {
    try {
        const { module } = req.params;
        
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ success: false, error: 'Module không hợp lệ' });
        }
        
        // Validate input
        const { error, value } = productSchema.validate(req.body, { allowUnknown: true });
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dữ liệu không hợp lệ: ' + error.details[0].message 
            });
        }
        
        const product = value;
        
        // Kiểm tra maGoc đã tồn tại chưa
        const data = syncData[module] || [];
        const exists = data.find(item => item.maGoc === product.maGoc);
        
        if (exists) {
            return res.status(409).json({ 
                success: false, 
                error: 'Sản phẩm với mã này đã tồn tại' 
            });
        }
        
        // Thêm timestamp
        product.ngayTao = product.ngayTao || new Date().toISOString();
        if (!product.lichSu) {
            product.lichSu = [];
        }
        
        // Thêm vào data
        data.push(product);
        syncData[module] = data;
        
        // Clear cache
        clearModuleCache(module);
        
        // Save async (không block) - sử dụng function để tránh lỗi scope
        const saveAsync = () => {
            if (config && config.USE_DATABASE && database) {
                database.saveAllData(module, data);
            } else {
                // Save to JSON file
                const fs = require('fs');
                const path = require('path');
                const DATA_DIR = './data';
                const filePath = path.join(DATA_DIR, `${module}.json`);
                const dataToSave = {
                    timestamp: new Date().toISOString(),
                    data: data
                };
                const tempFilePath = filePath + '.tmp';
                fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
                fs.renameSync(tempFilePath, filePath);
            }
        };
        setImmediate(saveAsync);
        
        // Broadcast WebSocket update
        // (sẽ được xử lý bởi sync-server)
        
        res.status(201).json({ 
            success: true, 
            data: product,
            message: 'Tạo sản phẩm thành công' 
        });
    } catch (error) {
        logger.error('API POST error', { error: error.message, module: req.params.module });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// PUT /api/:module/:maGoc - Cập nhật sản phẩm
router.put('/:module/:maGoc', async (req, res) => {
    try {
        const { module, maGoc } = req.params;
        
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ success: false, error: 'Module không hợp lệ' });
        }
        
        // Validate input
        const { error, value } = productSchema.validate(req.body, { allowUnknown: true });
        if (error) {
            return res.status(400).json({ 
                success: false, 
                error: 'Dữ liệu không hợp lệ: ' + error.details[0].message 
            });
        }
        
        const updates = value;
        
        // Tìm sản phẩm
        const data = syncData[module] || [];
        const index = data.findIndex(item => item.maGoc === maGoc);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Không tìm thấy sản phẩm' 
            });
        }
        
        // Cập nhật
        const product = data[index];
        Object.assign(product, updates);
        
        // Thêm vào lịch sử
        if (!product.lichSu) {
            product.lichSu = [];
        }
        product.lichSu.push({
            thoiGian: new Date().toLocaleString(),
            trangThai: product.trangThai,
            note: 'Cập nhật qua API'
        });
        
        // Clear cache
        clearModuleCache(module);
        
        // Save async
        setImmediate(() => {
            if (config && config.USE_DATABASE && database) {
                database.saveAllData(module, data);
            } else {
                const fs = require('fs');
                const path = require('path');
                const DATA_DIR = './data';
                const filePath = path.join(DATA_DIR, `${module}.json`);
                const dataToSave = {
                    timestamp: new Date().toISOString(),
                    data: data
                };
                const tempFilePath = filePath + '.tmp';
                fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
                fs.renameSync(tempFilePath, filePath);
            }
        });
        
        res.json({ 
            success: true, 
            data: product,
            message: 'Cập nhật thành công' 
        });
    } catch (error) {
        logger.error('API PUT error', { error: error.message, module: req.params.module });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// DELETE /api/:module/:maGoc - Xóa sản phẩm
router.delete('/:module/:maGoc', async (req, res) => {
    try {
        const { module, maGoc } = req.params;
        
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ success: false, error: 'Module không hợp lệ' });
        }
        
        // Tìm và xóa
        const data = syncData[module] || [];
        const index = data.findIndex(item => item.maGoc === maGoc);
        
        if (index === -1) {
            return res.status(404).json({ 
                success: false, 
                error: 'Không tìm thấy sản phẩm' 
            });
        }
        
        const deleted = data.splice(index, 1)[0];
        syncData[module] = data;
        
        // Clear cache
        clearModuleCache(module);
        
        // Save async
        setImmediate(() => {
            if (config && config.USE_DATABASE && database) {
                database.saveAllData(module, data);
            } else {
                const fs = require('fs');
                const path = require('path');
                const DATA_DIR = './data';
                const filePath = path.join(DATA_DIR, `${module}.json`);
                const dataToSave = {
                    timestamp: new Date().toISOString(),
                    data: data
                };
                const tempFilePath = filePath + '.tmp';
                fs.writeFileSync(tempFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
                fs.renameSync(tempFilePath, filePath);
            }
        });
        
        res.json({ 
            success: true, 
            message: 'Xóa thành công',
            data: deleted 
        });
    } catch (error) {
        logger.error('API DELETE error', { error: error.message, module: req.params.module });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// GET /api/:module/stats - Thống kê
router.get('/:module/stats', async (req, res) => {
    try {
        const { module } = req.params;
        
        if (!config || !config.MODULES || !config.MODULES.includes(module)) {
            return res.status(400).json({ success: false, error: 'Module không hợp lệ' });
        }
        
        // Cache key
        const cacheKey = `module:${module}:stats`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        const data = syncData[module] || [];
        
        // Thống kê
        const stats = {
            total: data.length,
            byStatus: {},
            byDate: {}
        };
        
        data.forEach(item => {
            // Thống kê theo status
            const status = item.trangThai || 'Unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            
            // Thống kê theo ngày
            if (item.ngayTao) {
                const date = new Date(item.ngayTao).toISOString().split('T')[0];
                stats.byDate[date] = (stats.byDate[date] || 0) + 1;
            }
        });
        
        const result = {
            success: true,
            data: stats,
            module: module
        };
        
        setCache(cacheKey, result);
        res.json(result);
    } catch (error) {
        logger.error('API stats error', { error: error.message, module: req.params.module });
        res.status(500).json({ success: false, error: 'Lỗi server' });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        modules: config ? config.MODULES : [],
        database: config && config.USE_DATABASE ? 'enabled' : 'disabled'
    });
});

module.exports = { router, initRoutes, clearModuleCache };

