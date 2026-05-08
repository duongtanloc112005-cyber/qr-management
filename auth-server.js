// 🔐 Authentication Server Module
// Xử lý authentication với bcrypt

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const USERS_FILE = './users.json';

// Mapping module name to role
const MODULE_ROLE_MAP = {
    'khophoi': 'kho_phoi',
    'sanxuat': 'san_xuat',
    'thanhpham': 'thanh_pham',  // Sửa: thanh_pham -> thanhpham
    'donghang': 'dong_hang',
    'hangsan': 'hang_san',
    'hangton': 'hang_ton',
    'tonghop': 'admin',
    'donhang': 'don_hang'
};

// Load users từ file
function loadUsers() {
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.warn('⚠️ users.json not found, using empty users list');
            return [];
        }
        const content = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ Error loading users:', error);
        return [];
    }
}

// Verify password với bcrypt
async function verifyPassword(plainPassword, hashedPassword) {
    try {
        // Nếu password chưa được hash (length < 60), so sánh trực tiếp (backward compatibility)
        if (hashedPassword.length < 60) {
            return plainPassword === hashedPassword;
        }
        // Nếu đã được hash, dùng bcrypt
        return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
        console.error('❌ Error verifying password:', error);
        return false;
    }
}

// Authenticate user
async function authenticate(username, password, moduleName) {
    const users = loadUsers();
    const role = MODULE_ROLE_MAP[moduleName];
    
    if (!role) {
        return { success: false, error: 'Invalid module name' };
    }
    
    // Tìm user theo username
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return { success: false, error: 'User not found' };
    }
    
    // Đối với Tổng Hợp: chỉ cho phép user có role = 'admin'
    if (moduleName === 'tonghop') {
        if (user.role !== 'admin') {
            return { success: false, error: 'Chỉ admin mới có quyền truy cập Tổng Hợp' };
        }
    } else {
        // Các module khác: Kiểm tra quyền truy cập module
        // Nếu user là admin, cho phép truy cập tất cả module
        if (user.role !== 'admin' && user.role !== role) {
            // Cho phép user đăng nhập vào bất kỳ module nào (linh hoạt)
            // Nếu muốn strict, uncomment dòng dưới:
            // return { success: false, error: 'User không có quyền truy cập module này' };
        }
    }
    
    // Verify password - BẮT BUỘC kiểm tra cho tất cả module, kể cả Tổng Hợp
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
        return { success: false, error: 'Invalid password' };
    }
    
    return { 
        success: true, 
        user: { 
            username: user.username, 
            role: user.role,
            display: user.display 
        } 
    };
}

// Check if user is authenticated (for saved sessions)
async function checkAuth(username, password, moduleName) {
    return await authenticate(username, password, moduleName);
}

module.exports = {
    authenticate,
    checkAuth,
    loadUsers,
    MODULE_ROLE_MAP
};

