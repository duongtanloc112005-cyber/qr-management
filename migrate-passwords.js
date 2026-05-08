#!/usr/bin/env node

/**
 * 🔐 Script migrate passwords từ plaintext sang bcrypt hash
 * 
 * Sử dụng:
 *   node migrate-passwords.js
 * 
 * Lưu ý: Script này sẽ tạo file users.json.backup trước khi migrate
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const USERS_FILE = './users.json';
const BACKUP_FILE = './users.json.backup';

async function migratePasswords() {
    console.log('🔐 Bắt đầu migrate passwords...\n');
    
    // Kiểm tra file users.json có tồn tại không
    if (!fs.existsSync(USERS_FILE)) {
        console.error('❌ Không tìm thấy file users.json');
        process.exit(1);
    }
    
    // Đọc users hiện tại
    let users;
    try {
        const content = fs.readFileSync(USERS_FILE, 'utf8');
        users = JSON.parse(content);
    } catch (error) {
        console.error('❌ Lỗi đọc file users.json:', error.message);
        process.exit(1);
    }
    
    // Tạo backup
    console.log('💾 Tạo backup...');
    try {
        fs.copyFileSync(USERS_FILE, BACKUP_FILE);
        console.log(`✅ Backup đã tạo: ${BACKUP_FILE}\n`);
    } catch (error) {
        console.error('❌ Lỗi tạo backup:', error.message);
        process.exit(1);
    }
    
    // Migrate từng user
    console.log('🔄 Đang hash passwords...\n');
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Kiểm tra xem password đã được hash chưa (bcrypt hash có độ dài 60 ký tự)
        if (user.password && user.password.length < 60) {
            // Password chưa được hash, hash nó
            try {
                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(user.password, saltRounds);
                users[i].password = hashedPassword;
                migratedCount++;
                console.log(`✅ Đã hash password cho user: ${user.username}`);
            } catch (error) {
                console.error(`❌ Lỗi hash password cho user ${user.username}:`, error.message);
            }
        } else {
            // Password đã được hash hoặc không có password
            skippedCount++;
            console.log(`⏭️  Bỏ qua user ${user.username} (đã được hash hoặc không có password)`);
        }
    }
    
    // Lưu file mới
    console.log('\n💾 Đang lưu file users.json mới...');
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        console.log('✅ Đã lưu file users.json mới\n');
    } catch (error) {
        console.error('❌ Lỗi lưu file:', error.message);
        console.log('💡 Khôi phục từ backup nếu cần');
        process.exit(1);
    }
    
    // Thống kê
    console.log('📊 Thống kê:');
    console.log(`   - Đã migrate: ${migratedCount} users`);
    console.log(`   - Đã bỏ qua: ${skippedCount} users`);
    console.log(`   - Tổng cộng: ${users.length} users\n`);
    
    console.log('✅ Migrate hoàn tất!');
    console.log(`💡 Backup được lưu tại: ${BACKUP_FILE}`);
    console.log('⚠️  Lưu ý: Xóa file backup sau khi đã xác nhận hệ thống hoạt động bình thường\n');
}

// Chạy migrate
if (require.main === module) {
    migratePasswords().catch(error => {
        console.error('❌ Lỗi không mong đợi:', error);
        process.exit(1);
    });
}

module.exports = { migratePasswords };








