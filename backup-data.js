const fs = require('fs');
const path = require('path');

// 📁 Cấu hình backup
const DATA_DIR = './data';
const BACKUP_DIR = './backups';
const MAX_BACKUPS = 10; // Giữ tối đa 10 backup

// Tạo thư mục backup nếu chưa có
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Created backup directory');
}

// 🔄 Hàm tạo backup
function createBackup() {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);
        
        // Tạo thư mục backup
        fs.mkdirSync(backupPath, { recursive: true });
        
        // Copy tất cả file dữ liệu
        const dataFiles = ['donghang.json', 'khophoi.json', 'sanxuat.json', 'thanhpham.json'];
        let successCount = 0;
        
        dataFiles.forEach(fileName => {
            const sourcePath = path.join(DATA_DIR, fileName);
            const destPath = path.join(backupPath, fileName);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                successCount++;
            }
        });
        
        // Tạo file metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            backupPath: backupPath,
            filesBackedUp: successCount,
            totalFiles: dataFiles.length
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'metadata.json'), 
            JSON.stringify(metadata, null, 2)
        );
        
        console.log(`✅ Backup created: ${backupPath} (${successCount}/${dataFiles.length} files)`);
        
        // Dọn dẹp backup cũ
        cleanupOldBackups();
        
        return true;
    } catch (error) {
        console.error('❌ Error creating backup:', error);
        return false;
    }
}

// 🧹 Hàm dọn dẹp backup cũ
function cleanupOldBackups() {
    try {
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(name => name.startsWith('backup-'))
            .map(name => ({
                name,
                path: path.join(BACKUP_DIR, name),
                timestamp: fs.statSync(path.join(BACKUP_DIR, name)).mtime
            }))
            .sort((a, b) => b.timestamp - a.timestamp); // Sắp xếp theo thời gian mới nhất
        
        // Xóa backup cũ nếu vượt quá giới hạn
        if (backups.length > MAX_BACKUPS) {
            const toDelete = backups.slice(MAX_BACKUPS);
            toDelete.forEach(backup => {
                fs.rmSync(backup.path, { recursive: true, force: true });
                console.log(`🗑️ Deleted old backup: ${backup.name}`);
            });
        }
    } catch (error) {
        console.error('❌ Error cleaning up backups:', error);
    }
}

// 📋 Hàm liệt kê backup
function listBackups() {
    try {
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(name => name.startsWith('backup-'))
            .map(name => {
                const backupPath = path.join(BACKUP_DIR, name);
                const metadataPath = path.join(backupPath, 'metadata.json');
                
                let metadata = null;
                if (fs.existsSync(metadataPath)) {
                    try {
                        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                    } catch (e) {
                        // Ignore metadata parse errors
                    }
                }
                
                return {
                    name,
                    path: backupPath,
                    timestamp: fs.statSync(backupPath).mtime,
                    metadata
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);
        
        console.log('\n📋 Available backups:');
        backups.forEach((backup, index) => {
            const timeStr = backup.metadata?.timestamp || backup.timestamp.toISOString();
            const filesCount = backup.metadata?.filesBackedUp || 'Unknown';
            console.log(`   ${index + 1}. ${backup.name}`);
            console.log(`      Time: ${timeStr}`);
            console.log(`      Files: ${filesCount}`);
        });
        
        return backups;
    } catch (error) {
        console.error('❌ Error listing backups:', error);
        return [];
    }
}

// 🔄 Hàm khôi phục từ backup
function restoreFromBackup(backupName) {
    try {
        const backupPath = path.join(BACKUP_DIR, backupName);
        
        if (!fs.existsSync(backupPath)) {
            console.error(`❌ Backup not found: ${backupName}`);
            return false;
        }
        
        // Tạo backup hiện tại trước khi khôi phục
        console.log('💾 Creating safety backup before restore...');
        createBackup();
        
        // Khôi phục từng file
        const dataFiles = ['donghang.json', 'khophoi.json', 'sanxuat.json', 'thanhpham.json'];
        let successCount = 0;
        
        dataFiles.forEach(fileName => {
            const sourcePath = path.join(backupPath, fileName);
            const destPath = path.join(DATA_DIR, fileName);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                successCount++;
                console.log(`✅ Restored: ${fileName}`);
            } else {
                console.log(`⚠️ File not found in backup: ${fileName}`);
            }
        });
        
        console.log(`✅ Restore completed: ${successCount}/${dataFiles.length} files restored`);
        return true;
    } catch (error) {
        console.error('❌ Error restoring backup:', error);
        return false;
    }
}

// 📊 Hàm thống kê backup
function getBackupStats() {
    try {
        const backups = fs.readdirSync(BACKUP_DIR)
            .filter(name => name.startsWith('backup-'));
        
        const totalSize = backups.reduce((total, backupName) => {
            const backupPath = path.join(BACKUP_DIR, backupName);
            const stats = fs.statSync(backupPath);
            return total + (stats.isDirectory() ? getDirSize(backupPath) : stats.size);
        }, 0);
        
        return {
            count: backups.length,
            totalSize: totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
        };
    } catch (error) {
        console.error('❌ Error getting backup stats:', error);
        return { count: 0, totalSize: 0, totalSizeMB: '0' };
    }
}

// 📏 Hàm tính kích thước thư mục
function getDirSize(dirPath) {
    let totalSize = 0;
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isDirectory()) {
            totalSize += getDirSize(filePath);
        } else {
            totalSize += stats.size;
        }
    });
    
    return totalSize;
}

// 🚀 Chạy backup nếu được gọi trực tiếp
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'create':
            console.log('🔄 Creating backup...');
            createBackup();
            break;
            
        case 'list':
            listBackups();
            break;
            
        case 'restore':
            const backupName = process.argv[3];
            if (!backupName) {
                console.error('❌ Please specify backup name');
                console.log('Usage: node backup-data.js restore <backup-name>');
                process.exit(1);
            }
            console.log(`🔄 Restoring from backup: ${backupName}`);
            restoreFromBackup(backupName);
            break;
            
        case 'stats':
            const stats = getBackupStats();
            console.log('\n📊 Backup Statistics:');
            console.log(`   Total backups: ${stats.count}`);
            console.log(`   Total size: ${stats.totalSizeMB} MB`);
            break;
            
        default:
            console.log('📋 Backup Management Tool');
            console.log('Usage:');
            console.log('  node backup-data.js create    - Create new backup');
            console.log('  node backup-data.js list     - List all backups');
            console.log('  node backup-data.js restore <name> - Restore from backup');
            console.log('  node backup-data.js stats     - Show backup statistics');
            break;
    }
}

module.exports = {
    createBackup,
    listBackups,
    restoreFromBackup,
    getBackupStats
};



