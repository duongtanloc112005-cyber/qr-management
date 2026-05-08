// 🗄️ SQLite Database Module - Tối ưu hiệu suất, không lag
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const DB_PATH = './data/qr_management.db';
const BATCH_SIZE = 1000; // Process 1000 items at a time để tránh lag

// Khởi tạo database
let db = null;

function initDatabase() {
    try {
        // Tạo thư mục data nếu chưa có
        const dataDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        db = new Database(DB_PATH);
        
        // Tối ưu SQLite performance
        db.pragma('journal_mode = WAL'); // Write-Ahead Logging - nhanh hơn
        db.pragma('synchronous = NORMAL'); // Balance giữa speed và safety
        db.pragma('cache_size = 10000'); // 10MB cache
        db.pragma('temp_store = MEMORY'); // Store temp tables in memory
        db.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O
        
        // Tạo tables
        createTables();
        
        logger.info('✅ Database initialized', { path: DB_PATH });
        return true;
    } catch (error) {
        logger.error('❌ Database initialization error', { error: error.message, stack: error.stack });
        return false;
    }
}

// Tạo tables
function createTables() {
    const modules = ['donghang', 'khophoi', 'sanxuat', 'thanhpham', 'hangsan', 'hangton'];
    
    modules.forEach(module => {
        // Tạo table cho mỗi module
        db.exec(`
            CREATE TABLE IF NOT EXISTS ${module} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                maGoc TEXT NOT NULL,
                data TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                UNIQUE(maGoc)
            );
            
            CREATE INDEX IF NOT EXISTS idx_${module}_maGoc ON ${module}(maGoc);
        `);
    });
    
    logger.info('✅ Database tables created');
}

// Lấy tất cả dữ liệu từ module (tối ưu với prepared statement)
function getAllData(module) {
    try {
        const stmt = db.prepare(`SELECT maGoc, data FROM ${module} ORDER BY id`);
        const rows = stmt.all();
        
        // Parse JSON data
        return rows.map(row => JSON.parse(row.data));
    } catch (error) {
        logger.error(`❌ Error getting data for ${module}`, { error: error.message });
        return [];
    }
}

// Lưu dữ liệu batch (tối ưu performance)
function saveDataBatch(module, data) {
    try {
        const insert = db.prepare(`INSERT OR REPLACE INTO ${module} (maGoc, data, timestamp) VALUES (?, ?, ?)`);
        const insertMany = db.transaction((items) => {
            for (const item of items) {
                insert.run(
                    item.maGoc || '',
                    JSON.stringify(item),
                    new Date().toISOString()
                );
            }
        });
        
        // Process in batches để tránh lag
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            insertMany(batch);
        }
        
        logger.info(`💾 Saved ${data.length} items to ${module}`, { module, count: data.length });
        return true;
    } catch (error) {
        logger.error(`❌ Error saving data for ${module}`, { error: error.message, stack: error.stack });
        return false;
    }
}

// Lưu toàn bộ dữ liệu (replace all)
function saveAllData(module, data) {
    try {
        // Delete all first
        db.prepare(`DELETE FROM ${module}`).run();
        
        // Insert new data
        return saveDataBatch(module, data);
    } catch (error) {
        logger.error(`❌ Error saving all data for ${module}`, { error: error.message });
        return false;
    }
}

// Tìm sản phẩm theo maGoc (nhanh với index)
function findProduct(module, maGoc) {
    try {
        const stmt = db.prepare(`SELECT data FROM ${module} WHERE maGoc = ?`);
        const row = stmt.get(maGoc);
        
        if (row) {
            return JSON.parse(row.data);
        }
        return null;
    } catch (error) {
        logger.error(`❌ Error finding product in ${module}`, { error: error.message });
        return null;
    }
}

// Đếm số lượng items
function countItems(module) {
    try {
        const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${module}`);
        const row = stmt.get();
        return row.count || 0;
    } catch (error) {
        logger.error(`❌ Error counting items in ${module}`, { error: error.message });
        return 0;
    }
}

// Xóa tất cả dữ liệu
function clearAllData(module) {
    try {
        db.prepare(`DELETE FROM ${module}`).run();
        logger.info(`🗑️ Cleared all data for ${module}`);
        return true;
    } catch (error) {
        logger.error(`❌ Error clearing data for ${module}`, { error: error.message });
        return false;
    }
}

// Đóng database
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        logger.info('✅ Database closed');
    }
}

// Export
module.exports = {
    initDatabase,
    getAllData,
    saveDataBatch,
    saveAllData,
    findProduct,
    countItems,
    clearAllData,
    closeDatabase,
    getDB: () => db
};

