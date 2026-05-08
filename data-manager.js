#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const backupModule = require('./backup-data');

// 🎛️ Menu chính
function showMenu() {
    console.log('\n🔧 Data Management Tool');
    console.log('================================');
    console.log('1. 📊 Show data statistics');
    console.log('2. 💾 Create backup');
    console.log('3. 📋 List backups');
    console.log('4. 🔄 Restore from backup');
    console.log('5. 🧹 Clean old backups');
    console.log('6. 📁 Show data files');
    console.log('7. 🗑️ Clean old data (manual cleanup)');
    console.log('8. ⚙️ Configure data retention');
    console.log('9. 🔍 Check data safety');
    console.log('10. 🗑️ Clear all data (DANGER)');
    console.log('11. ❌ Exit');
    console.log('================================');
}

// 📊 Hiển thị thống kê dữ liệu
function showDataStats() {
    console.log('\n📊 Data Statistics:');
    console.log('==================');
    
    const modules = ['donghang', 'khophoi', 'sanxuat', 'thanhpham'];
    const DATA_DIR = './data';
    
    modules.forEach(module => {
        const filePath = path.join(DATA_DIR, `${module}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                const itemCount = data.data ? data.data.length : 0;
                const lastSaved = data.timestamp || 'Unknown';
                const fileSize = fs.statSync(filePath).size;
                
                console.log(`\n📁 ${module.toUpperCase()}:`);
                console.log(`   Items: ${itemCount}`);
                console.log(`   File size: ${(fileSize / 1024).toFixed(2)} KB`);
                console.log(`   Last saved: ${lastSaved}`);
            } catch (error) {
                console.log(`\n📁 ${module.toUpperCase()}:`);
                console.log(`   ❌ Error reading file: ${error.message}`);
            }
        } else {
            console.log(`\n📁 ${module.toUpperCase()}:`);
            console.log(`   ⚠️ No data file found`);
        }
    });
    
    // Backup stats
    const backupStats = backupModule.getBackupStats();
    console.log(`\n🔄 BACKUP STATISTICS:`);
    console.log(`   Total backups: ${backupStats.count}`);
    console.log(`   Total size: ${backupStats.totalSizeMB} MB`);
}

// 📁 Hiển thị file dữ liệu
function showDataFiles() {
    console.log('\n📁 Data Files:');
    console.log('==============');
    
    const DATA_DIR = './data';
    const BACKUP_DIR = './backups';
    
    if (fs.existsSync(DATA_DIR)) {
        const files = fs.readdirSync(DATA_DIR);
        console.log(`\n📂 Data directory (${DATA_DIR}):`);
        files.forEach(file => {
            const filePath = path.join(DATA_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            console.log(`   ${file} (${sizeKB} KB)`);
        });
    } else {
        console.log('❌ Data directory not found');
    }
    
    if (fs.existsSync(BACKUP_DIR)) {
        const backups = fs.readdirSync(BACKUP_DIR);
        console.log(`\n📂 Backup directory (${BACKUP_DIR}):`);
        if (backups.length === 0) {
            console.log('   No backups found');
        } else {
            backups.forEach(backup => {
                const backupPath = path.join(BACKUP_DIR, backup);
                const stats = fs.statSync(backupPath);
                const sizeKB = (stats.size / 1024).toFixed(2);
                console.log(`   ${backup} (${sizeKB} KB)`);
            });
        }
    } else {
        console.log('❌ Backup directory not found');
    }
}

// 🧹 Dọn dẹp backup cũ
function cleanOldBackups() {
    console.log('\n🧹 Cleaning old backups...');
    backupModule.createBackup(); // Tạo backup mới trước khi dọn dẹp
    console.log('✅ Cleanup completed');
}

// 🗑️ Dọn dẹp dữ liệu cũ (CHẾ ĐỘ THỦ CÔNG)
function cleanOldData() {
    console.log('\n🗑️ Manual data cleanup...');
    console.log('This will remove data older than 999 days (manual mode - no time limit)');
    
    // Tạo backup trước khi dọn dẹp
    console.log('💾 Creating safety backup...');
    backupModule.createBackup();
    
    // Thực hiện dọn dẹp
    console.log('🧹 Starting cleanup...');
    
    const modules = ['donghang', 'khophoi', 'sanxuat', 'thanhpham'];
    const DATA_DIR = './data';
    const DATA_RETENTION_DAYS = 999;  // Giữ dữ liệu vô thời hạn (chế độ thủ công)
    const MAX_ITEMS_PER_MODULE = 99999;  // Không giới hạn số lượng sản phẩm
    
    modules.forEach(module => {
        const filePath = path.join(DATA_DIR, `${module}.json`);
        
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (data.data && Array.isArray(data.data)) {
                    const originalCount = data.data.length;
                    
                    // Lọc dữ liệu theo thời gian
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);
                    
                    data.data = data.data.filter(item => {
                        // Giữ lại sản phẩm có thời gian tạo gần đây
                        if (item.ngayTao) {
                            const itemDate = new Date(item.ngayTao);
                            return itemDate >= cutoffDate;
                        }
                        
                        // Nếu không có ngayTao, giữ lại sản phẩm có lichSu gần đây
                        if (item.lichSu && item.lichSu.length > 0) {
                            const lastUpdate = new Date(item.lichSu[item.lichSu.length - 1].thoiGian);
                            return lastUpdate >= cutoffDate;
                        }
                        
                        return true; // Giữ lại nếu không có thông tin thời gian
                    });
                    
                    // Giới hạn số lượng
                    if (data.data.length > MAX_ITEMS_PER_MODULE) {
                        data.data.sort((a, b) => {
                            const timeA = getItemTimestamp(a);
                            const timeB = getItemTimestamp(b);
                            return timeB - timeA;
                        });
                        data.data = data.data.slice(0, MAX_ITEMS_PER_MODULE);
                    }
                    
                    const removedCount = originalCount - data.data.length;
                    if (removedCount > 0) {
                        data.timestamp = new Date().toISOString();
                        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
                        console.log(`✅ Cleaned ${removedCount} old items from ${module}`);
                    } else {
                        console.log(`ℹ️ No old data found in ${module}`);
                    }
                }
            } catch (error) {
                console.log(`❌ Error cleaning ${module}: ${error.message}`);
            }
        }
    });
    
    console.log('✅ Data cleanup completed');
}

// 📅 Hàm lấy timestamp của sản phẩm
function getItemTimestamp(item) {
    if (item.ngayTao) {
        return new Date(item.ngayTao).getTime();
    }
    
    if (item.lichSu && item.lichSu.length > 0) {
        return new Date(item.lichSu[item.lichSu.length - 1].thoiGian).getTime();
    }
    
    return Date.now();
}

// ⚙️ Cấu hình data retention (CHẾ ĐỘ THỦ CÔNG)
function configureDataRetention() {
    console.log('\n⚙️ Data Retention Configuration (MANUAL MODE)');
    console.log('==============================================');
    console.log('Current settings:');
    console.log('  - Retention period: Unlimited (manual mode)');
    console.log('  - Max items per module: Unlimited');
    console.log('  - Auto cleanup: DISABLED (manual only)');
    console.log('  - Auto backup: Every 1 hour');
    console.log('  - Auto save: Every 30 seconds');
    console.log('\n💡 Manual operations:');
    console.log('  - Clear all data: Use UI "Xóa toàn bộ" button');
    console.log('  - Manual cleanup: node data-manager.js cleanup');
    console.log('  - Manual backup: node data-manager.js backup');
    console.log('\n💡 To modify settings, edit data-config.js:');
    console.log('  - DATA_RETENTION_DAYS = 999 (unlimited)');
    console.log('  - MAX_ITEMS_PER_MODULE = 99999 (unlimited)');
    console.log('  - AUTO_CLEANUP_INTERVAL = 0 (disabled)');
}

// 🔍 Kiểm tra an toàn dữ liệu
function checkDataSafety() {
    console.log('\n🔍 Data Safety Check');
    console.log('==================');
    
    const DATA_DIR = './data';
    const modules = ['donghang', 'khophoi', 'sanxuat', 'thanhpham'];
    
    let totalIssues = 0;
    let totalFiles = 0;
    let totalSize = 0;
    
    modules.forEach(module => {
        console.log(`\n📁 Checking ${module.toUpperCase()}:`);
        
        const filePath = path.join(DATA_DIR, `${module}.json`);
        const tempFilePath = filePath + '.tmp';
        
        // Kiểm tra file chính
        if (fs.existsSync(filePath)) {
            try {
                const stats = fs.statSync(filePath);
                const fileSize = stats.size;
                totalSize += fileSize;
                totalFiles++;
                
                const content = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(content);
                
                if (data.data && Array.isArray(data.data)) {
                    console.log(`   ✅ Main file: ${data.data.length} items (${(fileSize/1024).toFixed(2)} KB)`);
                    console.log(`   📅 Last saved: ${data.timestamp || 'Unknown'}`);
                } else {
                    console.log(`   ❌ Invalid data structure`);
                    totalIssues++;
                }
            } catch (error) {
                console.log(`   ❌ Main file corrupted: ${error.message}`);
                totalIssues++;
                
                // Kiểm tra file tạm
                if (fs.existsSync(tempFilePath)) {
                    try {
                        const tempContent = fs.readFileSync(tempFilePath, 'utf8');
                        const tempData = JSON.parse(tempContent);
                        
                        if (tempData.data && Array.isArray(tempData.data)) {
                            console.log(`   🔄 Temp file available: ${tempData.data.length} items`);
                            console.log(`   💡 Can be restored from temp file`);
                        } else {
                            console.log(`   ❌ Temp file also corrupted`);
                            totalIssues++;
                        }
                    } catch (tempError) {
                        console.log(`   ❌ Temp file corrupted: ${tempError.message}`);
                        totalIssues++;
                    }
                } else {
                    console.log(`   ❌ No temp file available`);
                    totalIssues++;
                }
            }
        } else {
            console.log(`   ⚠️ No main file found`);
            
            // Kiểm tra file tạm
            if (fs.existsSync(tempFilePath)) {
                try {
                    const tempContent = fs.readFileSync(tempFilePath, 'utf8');
                    const tempData = JSON.parse(tempContent);
                    
                    if (tempData.data && Array.isArray(tempData.data)) {
                        console.log(`   🔄 Temp file available: ${tempData.data.length} items`);
                        console.log(`   💡 Can be restored from temp file`);
                    } else {
                        console.log(`   ❌ Temp file corrupted`);
                        totalIssues++;
                    }
                } catch (tempError) {
                    console.log(`   ❌ Temp file corrupted: ${tempError.message}`);
                    totalIssues++;
                }
            } else {
                console.log(`   ℹ️ No data file (empty module)`);
            }
        }
    });
    
    // Thống kê tổng thể
    console.log('\n📊 Summary:');
    console.log(`   Total files: ${totalFiles}`);
    console.log(`   Total size: ${(totalSize/1024/1024).toFixed(2)} MB`);
    console.log(`   Issues found: ${totalIssues}`);
    
    if (totalIssues === 0) {
        console.log('   ✅ All data files are safe and intact');
    } else {
        console.log('   ⚠️ Some data files have issues');
        console.log('   💡 Consider running: node backup-data.js list');
        console.log('   💡 Consider restoring from backup if needed');
    }
    
    return totalIssues === 0;
}

// 🗑️ Xóa tất cả dữ liệu (NGUY HIỂM)
function clearAllData() {
    console.log('\n⚠️ DANGER: This will delete ALL data!');
    console.log('Are you sure? Type "DELETE" to confirm:');
    
    // Trong môi trường thực tế, bạn có thể sử dụng readline
    // Ở đây tôi sẽ giả lập
    console.log('❌ Operation cancelled for safety');
    console.log('💡 Use backup system instead of deleting data');
}

// 🔄 Khôi phục từ backup
function restoreFromBackup() {
    console.log('\n🔄 Available backups:');
    const backups = backupModule.listBackups();
    
    if (backups.length === 0) {
        console.log('❌ No backups found');
        return;
    }
    
    // Trong môi trường thực tế, bạn có thể sử dụng readline để chọn backup
    console.log('💡 To restore, use: node backup-data.js restore <backup-name>');
}

// 📋 Liệt kê backup
function listBackups() {
    console.log('\n📋 Available backups:');
    backupModule.listBackups();
}

// 💾 Tạo backup
function createBackup() {
    console.log('\n💾 Creating backup...');
    const success = backupModule.createBackup();
    if (success) {
        console.log('✅ Backup created successfully');
    } else {
        console.log('❌ Backup failed');
    }
}

// 🚀 Chương trình chính
function main() {
    console.log('🔧 QR Management System - Data Management Tool');
    console.log('===============================================');
    
    // Kiểm tra tham số dòng lệnh
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        const command = args[0];
        
        switch (command) {
            case 'stats':
                showDataStats();
                break;
            case 'backup':
                createBackup();
                break;
            case 'list':
                listBackups();
                break;
            case 'restore':
                restoreFromBackup();
                break;
            case 'clean':
                cleanOldBackups();
                break;
            case 'files':
                showDataFiles();
                break;
            case 'cleanup':
                cleanOldData();
                break;
            case 'config':
                configureDataRetention();
                break;
            case 'safety':
                checkDataSafety();
                break;
            case 'clear':
                clearAllData();
                break;
            default:
                console.log('❌ Unknown command:', command);
                console.log('💡 Available commands: stats, backup, list, restore, clean, files, cleanup, config, safety, clear');
                break;
        }
        return;
    }
    
    // Hiển thị menu tương tác
    showMenu();
    console.log('\n💡 For command line usage:');
    console.log('   node data-manager.js <command>');
    console.log('   Commands: stats, backup, list, restore, clean, files, cleanup, config, safety, clear');
}

// Chạy chương trình
if (require.main === module) {
    main();
}

module.exports = {
    showDataStats,
    showDataFiles,
    createBackup,
    listBackups,
    restoreFromBackup,
    cleanOldBackups,
    checkDataSafety
};


