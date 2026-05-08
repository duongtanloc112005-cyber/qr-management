/**
 * HỆ THỐNG KHÔI PHỤC DỮ LIỆU
 * =========================
 * 
 * Tính năng:
 * - Khôi phục dữ liệu bị mất
 * - Tự động backup dữ liệu
 * - Kiểm tra tính toàn vẹn dữ liệu
 * - Phục hồi từ backup
 */

class DataRecovery {
    constructor() {
        this.backupKey = 'quanly_backup_data';
        this.recoveryKey = 'quanly_recovery_data';
        this.autoBackupInterval = 5 * 60 * 1000; // 5 phút
        this.maxBackups = 3; // Giảm xuống 3 backup để tiết kiệm dung lượng
        this.minBackups = 1; // Giữ lại ít nhất 1 backup
        this.lastBackupTime = null; // Thời gian backup cuối cùng
        
        // Tự động dọn dẹp backup cũ khi khởi động
        this.cleanupOldBackupsOnInit();
        
        // Tự động backup định kỳ (chỉ backup nếu đã qua 5 phút)
        setInterval(() => {
            // Chỉ backup nếu không có lỗi localStorage
            if (this.checkLocalStorageAvailable()) {
                this.autoBackup();
            }
        }, this.autoBackupInterval);
        
        console.log('🔄 Hệ thống khôi phục dữ liệu đã khởi tạo');
    }
    
    /**
     * Kiểm tra localStorage có sẵn sàng không
     */
    checkLocalStorageAvailable() {
        try {
            const testKey = '__localStorage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('⚠️ localStorage đầy, bỏ qua backup tự động');
                return false;
            }
            return true;
        }
    }
    
    /**
     * Dọn dẹp backup cũ khi khởi động
     */
    cleanupOldBackupsOnInit() {
        try {
            const backups = this.getBackups();
            if (backups.length > this.maxBackups) {
                console.log(`🧹 Dọn dẹp backup cũ khi khởi động (${backups.length} → ${this.maxBackups})`);
                this.cleanupOldBackups(this.maxBackups);
            }
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp backup khi khởi động:', error);
        }
    }
    
    /**
     * Tự động backup dữ liệu (chỉ backup nếu localStorage còn chỗ)
     */
    async autoBackup() {
        // Kiểm tra localStorage trước khi backup
        if (!this.checkLocalStorageAvailable()) {
            // Nếu localStorage đầy, dọn dẹp backup cũ trước
            this.cleanupOldBackups(this.minBackups);
            
            // Kiểm tra lại sau khi dọn dẹp
            if (!this.checkLocalStorageAvailable()) {
                console.warn('⚠️ localStorage vẫn đầy sau khi dọn dẹp, bỏ qua backup');
                return;
            }
        }
        
        try {
            const modules = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];
            const backupData = {};
            
            for (const module of modules) {
                try {
                    const response = await fetch(`/api/${module}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Chỉ backup nếu có dữ liệu
                        if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
                            backupData[module] = data;
                        }
                    }
                } catch (error) {
                    // Không log warning, chỉ bỏ qua module đó
                    console.warn(`⚠️ Không thể backup ${module}:`, error.message);
                }
            }
            
            if (Object.keys(backupData).length > 0) {
                this.saveBackup(backupData);
                this.lastBackupTime = new Date().toISOString();
                // Không log mỗi lần backup để tránh spam console
            } else {
                console.warn('⚠️ Không có dữ liệu để backup');
            }
            
        } catch (error) {
            // Chỉ log lỗi nghiêm trọng, không throw
            if (error.name !== 'QuotaExceededError') {
                console.error('❌ Lỗi tự động backup:', error);
            }
        }
    }
    
    /**
     * Lưu backup dữ liệu với xử lý lỗi QuotaExceededError
     */
    saveBackup(data) {
        try {
            // Tối ưu dữ liệu trước khi backup (giảm dung lượng)
            const optimizedData = this.optimizeBackupData(data);
            
            const backup = {
                data: optimizedData,
                timestamp: new Date().toISOString(),
                version: Date.now()
            };
            
            const backups = this.getBackups();
            backups.push(backup);
            
            // Giữ lại chỉ backup gần nhất
            if (backups.length > this.maxBackups) {
                backups.shift();
            }
            
            // Kiểm tra kích thước trước khi lưu
            const backupStr = JSON.stringify(backups);
            const backupSize = new Blob([backupStr]).size;
            const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);
            
            // Cảnh báo nếu backup quá lớn
            if (backupSize > 8 * 1024 * 1024) {
                console.warn(`⚠️ Backup lớn: ${backupSizeMB}MB, sẽ dọn dẹp backup cũ`);
                // Dọn dẹp backup cũ hơn
                this.cleanupOldBackups(1); // Chỉ giữ lại 1 backup mới nhất
                // Lấy lại danh sách sau khi dọn dẹp
                const cleanedBackups = this.getBackups();
                cleanedBackups.push(backup);
                backups.length = 0;
                backups.push(...cleanedBackups);
            }
            
            // Thử lưu backup
            try {
                localStorage.setItem(this.backupKey, JSON.stringify(backups));
                console.log(`💾 Đã lưu backup dữ liệu (${backupSizeMB}MB)`);
            } catch (saveError) {
                // Nếu vẫn lỗi, thử dọn dẹp và lưu lại
                if (saveError.name === 'QuotaExceededError' || saveError.code === 22) {
                    console.warn('⚠️ localStorage đầy, đang dọn dẹp backup cũ...');
                    
                    // Dọn dẹp tất cả backup cũ, chỉ giữ lại backup mới nhất
                    this.cleanupOldBackups(0);
                    
                    // Thử lưu lại với chỉ backup mới nhất
                    try {
                        const newBackups = [backup];
                        localStorage.setItem(this.backupKey, JSON.stringify(newBackups));
                        console.log('✅ Đã lưu backup sau khi dọn dẹp');
                    } catch (retryError) {
                        console.error('❌ Không thể lưu backup sau khi dọn dẹp:', retryError);
                        // Không làm gì thêm, để tránh spam lỗi
                    }
                } else {
                    throw saveError;
                }
            }
            
        } catch (error) {
            // Chỉ log lỗi, không throw để tránh làm gián đoạn ứng dụng
            if (error.name !== 'QuotaExceededError') {
                console.error('❌ Lỗi lưu backup:', error);
            }
        }
    }
    
    /**
     * Tối ưu dữ liệu backup để giảm dung lượng
     */
    optimizeBackupData(data) {
        try {
            const optimized = {};
            
            for (const [module, moduleData] of Object.entries(data)) {
                if (Array.isArray(moduleData)) {
                    // Giảm lịch sử trong mỗi item (giữ lại 3 mục gần nhất)
                    optimized[module] = moduleData.map(item => {
                        const optimizedItem = { ...item };
                        if (optimizedItem.lichSu && Array.isArray(optimizedItem.lichSu) && optimizedItem.lichSu.length > 3) {
                            optimizedItem.lichSu = optimizedItem.lichSu.slice(-3);
                        }
                        return optimizedItem;
                    });
                } else {
                    optimized[module] = moduleData;
                }
            }
            
            return optimized;
        } catch (error) {
            console.error('❌ Lỗi tối ưu dữ liệu backup:', error);
            return data; // Trả về dữ liệu gốc nếu lỗi
        }
    }
    
    /**
     * Dọn dẹp backup cũ
     */
    cleanupOldBackups(keepCount = this.minBackups) {
        try {
            const backups = this.getBackups();
            
            if (backups.length <= keepCount) {
                return; // Không cần dọn dẹp
            }
            
            // Sắp xếp theo timestamp (mới nhất trước)
            backups.sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA;
            });
            
            // Giữ lại chỉ số backup mới nhất
            const keepBackups = backups.slice(0, keepCount);
            
            // Xóa tất cả backup cũ
            try {
                if (keepBackups.length > 0) {
                    localStorage.setItem(this.backupKey, JSON.stringify(keepBackups));
                    console.log(`🧹 Đã dọn dẹp backup cũ, giữ lại ${keepBackups.length} backup mới nhất`);
                } else {
                    localStorage.removeItem(this.backupKey);
                    console.log('🧹 Đã xóa tất cả backup cũ');
                }
            } catch (cleanupError) {
                // Nếu vẫn lỗi, thử xóa toàn bộ
                if (cleanupError.name === 'QuotaExceededError' || cleanupError.code === 22) {
                    console.warn('⚠️ Vẫn lỗi sau khi dọn dẹp, sẽ xóa toàn bộ backup');
                    try {
                        localStorage.removeItem(this.backupKey);
                        console.log('✅ Đã xóa toàn bộ backup để giải phóng dung lượng');
                    } catch (removeError) {
                        console.error('❌ Không thể xóa backup:', removeError);
                    }
                } else {
                    throw cleanupError;
                }
            }
            
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp backup:', error);
        }
    }
    
    /**
     * Lấy danh sách backup
     */
    getBackups() {
        try {
            const backups = localStorage.getItem(this.backupKey);
            return backups ? JSON.parse(backups) : [];
        } catch (error) {
            console.error('❌ Lỗi đọc backup:', error);
            return [];
        }
    }
    
    /**
     * Khôi phục dữ liệu từ backup
     */
    async restoreFromBackup(backupIndex = -1) {
        try {
            const backups = this.getBackups();
            if (backups.length === 0) {
                throw new Error('Không có backup nào để khôi phục');
            }
            
            const backup = backupIndex === -1 ? backups[backups.length - 1] : backups[backupIndex];
            if (!backup) {
                throw new Error('Backup không tồn tại');
            }
            
            console.log(`🔄 Đang khôi phục từ backup ${backup.timestamp}...`);
            
            // Khôi phục từng module
            for (const [module, data] of Object.entries(backup.data)) {
                try {
                    await this.restoreModule(module, data);
                    console.log(`✅ Đã khôi phục ${module}`);
                } catch (error) {
                    console.error(`❌ Lỗi khôi phục ${module}:`, error);
                }
            }
            
            console.log('🎉 Đã khôi phục dữ liệu thành công');
            return true;
            
        } catch (error) {
            console.error('❌ Lỗi khôi phục dữ liệu:', error);
            return false;
        }
    }
    
    /**
     * Khôi phục một module cụ thể
     */
    async restoreModule(module, data) {
        const response = await fetch(`/api/${module}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Kiểm tra tính toàn vẹn dữ liệu
     */
    async checkDataIntegrity() {
        try {
            const modules = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];
            const integrityReport = {
                timestamp: new Date().toISOString(),
                modules: {},
                overall: 'healthy'
            };
            
            for (const module of modules) {
                try {
                    const response = await fetch(`/api/${module}`);
                    if (response.ok) {
                        const data = await response.json();
                        const integrity = this.validateModuleData(data);
                        integrityReport.modules[module] = integrity;
                        
                        if (integrity.status !== 'healthy') {
                            integrityReport.overall = 'warning';
                        }
                    } else {
                        integrityReport.modules[module] = {
                            status: 'error',
                            message: `HTTP ${response.status}`
                        };
                        integrityReport.overall = 'error';
                    }
                } catch (error) {
                    integrityReport.modules[module] = {
                        status: 'error',
                        message: error.message
                    };
                    integrityReport.overall = 'error';
                }
            }
            
            console.log('🔍 Báo cáo tính toàn vẹn dữ liệu:', integrityReport);
            return integrityReport;
            
        } catch (error) {
            console.error('❌ Lỗi kiểm tra tính toàn vẹn:', error);
            return null;
        }
    }
    
    /**
     * Xác thực dữ liệu module
     */
    validateModuleData(data) {
        try {
            if (!data || !data.data || !Array.isArray(data.data)) {
                return {
                    status: 'error',
                    message: 'Cấu trúc dữ liệu không hợp lệ'
                };
            }
            
            const items = data.data;
            const issues = [];
            
            // Kiểm tra các trường bắt buộc
            const requiredFields = ['maGoc', 'trangThai', 'dotHang'];
            items.forEach((item, index) => {
                requiredFields.forEach(field => {
                    if (!item[field]) {
                        issues.push(`Item ${index}: Thiếu trường ${field}`);
                    }
                });
            });
            
            // Kiểm tra trạng thái hợp lệ
            const validStatuses = ['Hoàn thành', 'Nhận hàng', 'Đang xử lý'];
            items.forEach((item, index) => {
                if (!validStatuses.includes(item.trangThai)) {
                    issues.push(`Item ${index}: Trạng thái không hợp lệ: ${item.trangThai}`);
                }
            });
            
            if (issues.length === 0) {
                return {
                    status: 'healthy',
                    message: `Dữ liệu hợp lệ (${items.length} items)`
                };
            } else {
                return {
                    status: 'warning',
                    message: `Có ${issues.length} vấn đề`,
                    issues: issues
                };
            }
            
        } catch (error) {
            return {
                status: 'error',
                message: `Lỗi xác thực: ${error.message}`
            };
        }
    }
    
    /**
     * Tự động sửa lỗi dữ liệu
     */
    async autoFixData() {
        try {
            console.log('🔧 Bắt đầu tự động sửa lỗi dữ liệu...');
            
            const modules = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];
            let fixedCount = 0;
            
            for (const module of modules) {
                try {
                    const response = await fetch(`/api/${module}`);
                    if (response.ok) {
                        const data = await response.json();
                        const fixedData = this.fixModuleData(data);
                        
                        if (fixedData.fixed) {
                            await this.updateModule(module, fixedData.data);
                            fixedCount++;
                            console.log(`✅ Đã sửa lỗi ${module}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Lỗi sửa ${module}:`, error);
                }
            }
            
            console.log(`🎉 Đã sửa lỗi ${fixedCount} module`);
            return fixedCount > 0;
            
        } catch (error) {
            console.error('❌ Lỗi tự động sửa lỗi:', error);
            return false;
        }
    }
    
    /**
     * Sửa lỗi dữ liệu module
     */
    fixModuleData(data) {
        try {
            if (!data || !data.data || !Array.isArray(data.data)) {
                return { fixed: false, data: data };
            }
            
            let fixed = false;
            const items = data.data.map(item => {
                const fixedItem = { ...item };
                
                // Sửa trạng thái không hợp lệ
                if (!['Hoàn thành', 'Nhận hàng', 'Đang xử lý'].includes(fixedItem.trangThai)) {
                    fixedItem.trangThai = 'Đang xử lý';
                    fixed = true;
                }
                
                // Sửa trường bắt buộc
                if (!fixedItem.maGoc) {
                    fixedItem.maGoc = `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    fixed = true;
                }
                
                if (!fixedItem.dotHang) {
                    fixedItem.dotHang = 'Đợt 1';
                    fixed = true;
                }
                
                // Thêm lịch sử sửa lỗi
                if (fixed) {
                    if (!fixedItem.lichSu) {
                        fixedItem.lichSu = [];
                    }
                    fixedItem.lichSu.push({
                        thoiGian: new Date().toLocaleString(),
                        trangThai: 'Tự động sửa lỗi',
                        note: 'Hệ thống tự động sửa lỗi dữ liệu'
                    });
                }
                
                return fixedItem;
            });
            
            return {
                fixed: fixed,
                data: { ...data, data: items }
            };
            
        } catch (error) {
            console.error('❌ Lỗi sửa dữ liệu module:', error);
            return { fixed: false, data: data };
        }
    }
    
    /**
     * Cập nhật module
     */
    async updateModule(module, data) {
        const response = await fetch(`/api/${module}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Lấy thông tin backup
     */
    getBackupInfo() {
        try {
            const backups = this.getBackups();
            let totalSize = 0;
            
            // Tính tổng dung lượng backup
            try {
                const backupStr = localStorage.getItem(this.backupKey);
                if (backupStr) {
                    totalSize = new Blob([backupStr]).size;
                }
            } catch (e) {
                // Bỏ qua lỗi
            }
            
            return {
                count: backups.length,
                latest: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
                oldest: backups.length > 0 ? backups[0].timestamp : null,
                totalSize: totalSize,
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            console.error('❌ Lỗi lấy thông tin backup:', error);
            return { count: 0, latest: null, oldest: null, totalSize: 0, totalSizeMB: '0.00' };
        }
    }
    
    /**
     * Dọn dẹp backup thủ công (có thể gọi từ console)
     */
    manualCleanup(keepCount = 1) {
        try {
            const beforeInfo = this.getBackupInfo();
            this.cleanupOldBackups(keepCount);
            const afterInfo = this.getBackupInfo();
            
            const freedSize = beforeInfo.totalSize - afterInfo.totalSize;
            const freedSizeMB = (freedSize / (1024 * 1024)).toFixed(2);
            
            console.log(`✅ Đã dọn dẹp backup:`);
            console.log(`   - Trước: ${beforeInfo.count} backup (${beforeInfo.totalSizeMB}MB)`);
            console.log(`   - Sau: ${afterInfo.count} backup (${afterInfo.totalSizeMB}MB)`);
            console.log(`   - Giải phóng: ${freedSizeMB}MB`);
            
            return {
                success: true,
                before: beforeInfo,
                after: afterInfo,
                freedMB: freedSizeMB
            };
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp backup thủ công:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Khởi tạo hệ thống khôi phục dữ liệu
const dataRecovery = new DataRecovery();

// Xuất ra global scope
window.dataRecovery = dataRecovery;

console.log('🚀 Hệ thống khôi phục dữ liệu đã sẵn sàng');












