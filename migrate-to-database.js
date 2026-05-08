#!/usr/bin/env node

/**
 * 🔄 Script migrate dữ liệu từ JSON sang SQLite database
 * 
 * Sử dụng:
 *   node migrate-to-database.js
 * 
 * Lưu ý: Script này sẽ backup JSON files trước khi migrate
 */

const fs = require('fs');
const path = require('path');
const database = require('./database');
const logger = require('./logger');

const DATA_DIR = './data';
const MODULES = ['donghang', 'khophoi', 'sanxuat', 'thanhpham', 'hangsan', 'hangton'];

async function migrateToDatabase() {
    console.log('🔄 Bắt đầu migrate dữ liệu từ JSON sang SQLite...\n');
    
    // Khởi tạo database
    console.log('📁 Khởi tạo database...');
    if (!database.initDatabase()) {
        console.error('❌ Không thể khởi tạo database');
        process.exit(1);
    }
    
    // Backup JSON files
    console.log('💾 Tạo backup JSON files...');
    const backupDir = path.join(DATA_DIR, 'json_backup_' + new Date().toISOString().replace(/[:.]/g, '-'));
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }
    
    let totalMigrated = 0;
    let totalErrors = 0;
    
    // Migrate từng module
    for (const module of MODULES) {
        const jsonFile = path.join(DATA_DIR, `${module}.json`);
        
        if (!fs.existsSync(jsonFile)) {
            console.log(`⏭️  Bỏ qua ${module} (không có file JSON)`);
            continue;
        }
        
        try {
            console.log(`\n📂 Migrating ${module}...`);
            
            // Backup JSON file
            const backupFile = path.join(backupDir, `${module}.json`);
            fs.copyFileSync(jsonFile, backupFile);
            console.log(`   ✅ Backup: ${backupFile}`);
            
            // Đọc JSON data
            const content = fs.readFileSync(jsonFile, 'utf8');
            const jsonData = JSON.parse(content);
            const items = jsonData.data || [];
            
            if (items.length === 0) {
                console.log(`   ℹ️  Không có dữ liệu để migrate`);
                continue;
            }
            
            // Migrate to database (batch processing để tránh lag)
            console.log(`   📊 Migrating ${items.length} items...`);
            const startTime = Date.now();
            
            const success = database.saveAllData(module, items);
            
            if (success) {
                const duration = Date.now() - startTime;
                console.log(`   ✅ Migrated ${items.length} items in ${duration}ms`);
                totalMigrated += items.length;
            } else {
                console.error(`   ❌ Error migrating ${module}`);
                totalErrors++;
            }
            
        } catch (error) {
            console.error(`   ❌ Error migrating ${module}:`, error.message);
            totalErrors++;
        }
    }
    
    // Thống kê
    console.log('\n📊 Thống kê migration:');
    console.log(`   - Tổng items migrated: ${totalMigrated}`);
    console.log(`   - Modules có lỗi: ${totalErrors}`);
    console.log(`   - Backup location: ${backupDir}\n`);
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    for (const module of MODULES) {
        const count = database.countItems(module);
        console.log(`   ${module}: ${count} items`);
    }
    
    console.log('\n✅ Migration hoàn tất!');
    console.log(`💡 Backup JSON files tại: ${backupDir}`);
    console.log('⚠️  Lưu ý: JSON files vẫn được giữ lại, có thể xóa sau khi đã xác nhận database hoạt động tốt\n');
    
    // Đóng database
    database.closeDatabase();
}

// Chạy migration
if (require.main === module) {
    migrateToDatabase().catch(error => {
        console.error('❌ Lỗi không mong đợi:', error);
        logger.error('Migration error', { error: error.message, stack: error.stack });
        process.exit(1);
    });
}

module.exports = { migrateToDatabase };

