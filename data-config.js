// ⚙️ Cấu hình quản lý dữ liệu
module.exports = {
    // 📅 Cấu hình thời gian lưu trữ (CHẾ ĐỘ THỦ CÔNG)
    DATA_RETENTION_DAYS: 999,      // Giữ dữ liệu vô thời hạn (chế độ thủ công)
    MAX_ITEMS_PER_MODULE: 99999,   // Không giới hạn số lượng sản phẩm
    
    // ⏰ Cấu hình tự động
    AUTO_SAVE_INTERVAL: 3000,      // Tự động lưu mỗi 3 giây (giảm thiểu mất dữ liệu khi mất điện)
    AUTO_BACKUP_INTERVAL: 1800000, // Tự động backup mỗi 30 phút (thường xuyên hơn)
    AUTO_CLEANUP_INTERVAL: 0,      // TẮT tự động dọn dẹp (chế độ thủ công)
    
    // 🗂️ Cấu hình backup
    MAX_BACKUPS: 10,               // Giữ tối đa 10 backup
    BACKUP_DIR: './backups',       // Thư mục backup
    DATA_DIR: './data',           // Thư mục dữ liệu
    
    // 📊 Cấu hình hiệu suất
    MAX_CACHE_SIZE: 2000,         // Tối đa 2000 entries trong cache (tăng cho dữ liệu lớn)
    CACHE_CLEANUP_INTERVAL: 180000, // Dọn dẹp cache mỗi 3 phút (thường xuyên hơn)
    
    // 🛡️ Cấu hình bảo mật
    SAFE_SHUTDOWN: true,           // Lưu dữ liệu khi tắt server
    AUTO_BACKUP_BEFORE_CLEANUP: true, // Tạo backup trước khi dọn dẹp
    
    // 📈 Cấu hình giám sát
    ENABLE_STATS: true,            // Bật thống kê dữ liệu
    LOG_CLEANUP: true,             // Ghi log khi dọn dẹp
    LOG_BACKUP: true,              // Ghi log khi backup
    
    // 🔧 Cấu hình nâng cao
    COMPRESS_OLD_DATA: false,      // Nén dữ liệu cũ (chưa implement)
    ARCHIVE_OLD_BACKUPS: false,    // Lưu trữ backup cũ (chưa implement)
    
    // 📋 Danh sách module
    MODULES: ['donghang', 'khophoi', 'sanxuat', 'thanhpham'],
    
    // 🗄️ Cấu hình database
    USE_DATABASE: true, // ✅ ĐÃ BẬT - Tối ưu hiệu suất cho 100,000+ records
    DATABASE_PATH: './data/qr_management.db',
    DATABASE_BATCH_SIZE: 1000, // Batch size cho database operations
    
    // 🎯 Mục tiêu hiệu suất (CHẾ ĐỘ THỦ CÔNG)
    TARGET_MAX_SIZE_MB: 1000,     // Mục tiêu tối đa 1000MB dữ liệu (chế độ thủ công)
    WARNING_SIZE_MB: 500,         // Cảnh báo khi vượt 500MB
    
    // 📝 Mô tả cấu hình
    DESCRIPTION: {
        DATA_RETENTION_DAYS: 'Số ngày giữ dữ liệu (mặc định: 7 ngày)',
        MAX_ITEMS_PER_MODULE: 'Số sản phẩm tối đa mỗi module (mặc định: 1000)',
        AUTO_SAVE_INTERVAL: 'Khoảng thời gian tự động lưu (ms)',
        AUTO_BACKUP_INTERVAL: 'Khoảng thời gian tự động backup (ms)',
        AUTO_CLEANUP_INTERVAL: 'Khoảng thời gian tự động dọn dẹp (ms)',
        MAX_BACKUPS: 'Số backup tối đa giữ lại',
        TARGET_MAX_SIZE_MB: 'Mục tiêu kích thước dữ liệu tối đa (MB)',
        WARNING_SIZE_MB: 'Ngưỡng cảnh báo kích thước dữ liệu (MB)'
    }
};
