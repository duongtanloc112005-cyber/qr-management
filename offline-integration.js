/**
 * TÍCH HỢP TÍNH NĂNG OFFLINE VÀO HỆ THỐNG
 * =====================================
 * 
 * Tích hợp các tính năng:
 * - Lưu trữ offline
 * - Tự động đồng bộ
 * - Khôi phục dữ liệu
 * - Đảm bảo tính toàn vẹn dữ liệu
 */

// Tích hợp vào các module hiện tại
const modules = ['khophoi', 'sanxuat', 'thanhpham', 'donghang'];

// Hàm tích hợp offline storage vào module
function integrateOfflineStorage(moduleName) {
    const originalSaveFunction = window[`save${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`];
    
    if (originalSaveFunction) {
        // Ghi đè hàm save gốc
        window[`save${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`] = async function(data) {
            try {
                // Lưu offline trước
                if (window.offlineStorage) {
                    window.offlineStorage.saveOfflineData(moduleName, data);
                }
                
                // Thử lưu online
                if (navigator.onLine) {
                    try {
                        const response = await fetch(`/api/${moduleName}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        });
                        
                        if (response.ok) {
                            console.log(`✅ Đã lưu ${moduleName} online`);
                            return await response.json();
                        } else {
                            throw new Error(`HTTP ${response.status}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Lỗi lưu online ${moduleName}, dữ liệu đã được lưu offline:`, error);
                        return { success: true, offline: true, message: 'Dữ liệu đã được lưu offline' };
                    }
                } else {
                    console.log(`📴 Offline - Đã lưu ${moduleName} cục bộ`);
                    return { success: true, offline: true, message: 'Dữ liệu đã được lưu offline' };
                }
                
            } catch (error) {
                console.error(`❌ Lỗi lưu ${moduleName}:`, error);
                throw error;
            }
        };
    }
}

// Tích hợp vào tất cả module
modules.forEach(module => {
    integrateOfflineStorage(module);
});

// Hàm kiểm tra và khôi phục dữ liệu khi khởi động
async function initializeOfflineFeatures() {
    console.log('🚀 Khởi tạo tính năng offline...');
    
    try {
        // Kiểm tra kết nối
        await window.offlineStorage.checkConnection();
        
        // Nếu có kết nối, đồng bộ dữ liệu offline
        if (navigator.onLine) {
            await window.offlineStorage.syncOfflineData();
        }
        
        // Kiểm tra tính toàn vẹn dữ liệu
        const integrityReport = await window.dataRecovery.checkDataIntegrity();
        if (integrityReport && integrityReport.overall !== 'healthy') {
            console.warn('⚠️ Phát hiện vấn đề dữ liệu, đang tự động sửa...');
            await window.dataRecovery.autoFixData();
        }
        
        // Cập nhật UI trạng thái kết nối
        updateConnectionUI();
        
        console.log('✅ Tính năng offline đã sẵn sàng');
        
    } catch (error) {
        console.error('❌ Lỗi khởi tạo tính năng offline:', error);
    }
}

// Cập nhật UI trạng thái kết nối
function updateConnectionUI() {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        if (navigator.onLine) {
            statusElement.innerHTML = '🟢 Đã kết nối - Dữ liệu được đồng bộ';
            statusElement.className = 'connection-online';
        } else {
            statusElement.innerHTML = '🔴 Offline - Dữ liệu được lưu cục bộ';
            statusElement.className = 'connection-offline';
        }
    }
}

// Hàm xử lý khi mất kết nối
function handleConnectionLoss() {
    console.log('📴 Mất kết nối - Chuyển sang chế độ offline');
    
    // Hiển thị thông báo cho người dùng
    showOfflineNotification();
    
    // Cập nhật UI
    updateConnectionUI();
}

// Hàm xử lý khi khôi phục kết nối
async function handleConnectionRestore() {
    console.log('🌐 Khôi phục kết nối - Đang đồng bộ dữ liệu...');
    
    try {
        // Đồng bộ dữ liệu offline
        await window.offlineStorage.syncOfflineData();
        
        // Cập nhật UI
        updateConnectionUI();
        
        // Hiển thị thông báo thành công
        showSyncSuccessNotification();
        
    } catch (error) {
        console.error('❌ Lỗi đồng bộ dữ liệu:', error);
        showSyncErrorNotification(error);
    }
}

// Hiển thị thông báo offline
function showOfflineNotification() {
    const notification = document.createElement('div');
    notification.className = 'offline-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">📴</span>
            <span class="notification-text">Mất kết nối - Dữ liệu được lưu cục bộ</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Hiển thị thông báo đồng bộ thành công
function showSyncSuccessNotification() {
    const notification = document.createElement('div');
    notification.className = 'sync-success-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">✅</span>
            <span class="notification-text">Đã đồng bộ dữ liệu thành công</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Hiển thị thông báo lỗi đồng bộ
function showSyncErrorNotification(error) {
    const notification = document.createElement('div');
    notification.className = 'sync-error-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">❌</span>
            <span class="notification-text">Lỗi đồng bộ: ${error.message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Thêm CSS cho thông báo
const notificationCSS = `
    .offline-notification,
    .sync-success-notification,
    .sync-error-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    }
    
    .offline-notification {
        border-left: 4px solid #ff9800;
    }
    
    .sync-success-notification {
        border-left: 4px solid #4caf50;
    }
    
    .sync-error-notification {
        border-left: 4px solid #f44336;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    
    .notification-icon {
        font-size: 18px;
    }
    
    .notification-text {
        font-size: 14px;
        color: #333;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .connection-online {
        color: #4caf50;
        font-weight: bold;
    }
    
    .connection-offline {
        color: #f44336;
        font-weight: bold;
    }
`;

// Thêm CSS vào trang
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Lắng nghe sự kiện kết nối
window.addEventListener('online', handleConnectionRestore);
window.addEventListener('offline', handleConnectionLoss);

// Khởi tạo khi trang tải
document.addEventListener('DOMContentLoaded', initializeOfflineFeatures);

// Xuất ra global scope
window.initializeOfflineFeatures = initializeOfflineFeatures;
window.handleConnectionLoss = handleConnectionLoss;
window.handleConnectionRestore = handleConnectionRestore;

console.log('🚀 Tích hợp tính năng offline đã hoàn thành');












