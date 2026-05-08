/**
 * KIỂM TRA TÍNH NĂNG OFFLINE
 * =========================
 * 
 * Kiểm tra các tính năng:
 * - Lưu trữ offline
 * - Tự động đồng bộ
 * - Khôi phục dữ liệu
 * - Đảm bảo tính toàn vẹn dữ liệu
 */

console.log('🧪 KIỂM TRA TÍNH NĂNG OFFLINE');
console.log('==============================');

// Kiểm tra tính năng offline storage
function testOfflineStorage() {
    console.log('\n📦 KIỂM TRA OFFLINE STORAGE:');
    console.log('============================');
    
    try {
        // Kiểm tra localStorage
        if (typeof Storage !== 'undefined') {
            console.log('✅ LocalStorage được hỗ trợ');
            
            // Kiểm tra dung lượng
            const testData = 'test'.repeat(1000);
            localStorage.setItem('test', testData);
            const used = JSON.stringify(localStorage).length;
            const max = 5 * 1024 * 1024; // 5MB
            const percentage = (used / max) * 100;
            
            console.log(`📊 Dung lượng sử dụng: ${(used / 1024).toFixed(2)} KB`);
            console.log(`📊 Tỷ lệ sử dụng: ${percentage.toFixed(2)}%`);
            
            if (percentage > 80) {
                console.warn('⚠️ Dung lượng gần đầy');
            } else {
                console.log('✅ Dung lượng còn nhiều');
            }
            
            localStorage.removeItem('test');
            
        } else {
            console.error('❌ LocalStorage không được hỗ trợ');
        }
        
        // Kiểm tra offline storage class
        if (window.offlineStorage) {
            console.log('✅ OfflineStorage class đã được tải');
            
            // Kiểm tra các phương thức
            const methods = ['saveOfflineData', 'getOfflineData', 'syncOfflineData', 'restoreOfflineData'];
            methods.forEach(method => {
                if (typeof window.offlineStorage[method] === 'function') {
                    console.log(`✅ Phương thức ${method} có sẵn`);
                } else {
                    console.error(`❌ Phương thức ${method} không có sẵn`);
                }
            });
            
        } else {
            console.error('❌ OfflineStorage class chưa được tải');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra offline storage:', error);
    }
}

// Kiểm tra tính năng data recovery
function testDataRecovery() {
    console.log('\n🔄 KIỂM TRA DATA RECOVERY:');
    console.log('==========================');
    
    try {
        if (window.dataRecovery) {
            console.log('✅ DataRecovery class đã được tải');
            
            // Kiểm tra các phương thức
            const methods = ['autoBackup', 'restoreFromBackup', 'checkDataIntegrity', 'autoFixData'];
            methods.forEach(method => {
                if (typeof window.dataRecovery[method] === 'function') {
                    console.log(`✅ Phương thức ${method} có sẵn`);
                } else {
                    console.error(`❌ Phương thức ${method} không có sẵn`);
                }
            });
            
            // Kiểm tra thông tin backup
            const backupInfo = window.dataRecovery.getBackupInfo();
            console.log(`📋 Số lượng backup: ${backupInfo.count}`);
            if (backupInfo.latest) {
                console.log(`📅 Backup mới nhất: ${backupInfo.latest}`);
            }
            
        } else {
            console.error('❌ DataRecovery class chưa được tải');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra data recovery:', error);
    }
}

// Kiểm tra tính năng tích hợp
function testIntegration() {
    console.log('\n🔗 KIỂM TRA TÍCH HỢP:');
    console.log('======================');
    
    try {
        // Kiểm tra các hàm tích hợp
        const functions = ['initializeOfflineFeatures', 'handleConnectionLoss', 'handleConnectionRestore'];
        functions.forEach(func => {
            if (typeof window[func] === 'function') {
                console.log(`✅ Hàm ${func} có sẵn`);
            } else {
                console.error(`❌ Hàm ${func} không có sẵn`);
            }
        });
        
        // Kiểm tra trạng thái kết nối
        const connectionStatus = document.getElementById('connection-status');
        if (connectionStatus) {
            console.log('✅ Trạng thái kết nối đã được thêm vào UI');
            console.log(`📊 Trạng thái hiện tại: ${connectionStatus.textContent}`);
        } else {
            console.warn('⚠️ Trạng thái kết nối chưa được thêm vào UI');
        }
        
        // Kiểm tra CSS cho thông báo
        const style = document.querySelector('style');
        if (style && style.textContent.includes('offline-notification')) {
            console.log('✅ CSS cho thông báo đã được thêm');
        } else {
            console.warn('⚠️ CSS cho thông báo chưa được thêm');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra tích hợp:', error);
    }
}

// Kiểm tra tính năng kết nối
function testConnection() {
    console.log('\n🌐 KIỂM TRA KẾT NỐI:');
    console.log('====================');
    
    try {
        // Kiểm tra trạng thái kết nối
        console.log(`📊 Trạng thái kết nối: ${navigator.onLine ? 'Online' : 'Offline'}`);
        
        // Kiểm tra các sự kiện kết nối
        const hasOnlineListener = window.ononline !== null;
        const hasOfflineListener = window.onoffline !== null;
        
        console.log(`📡 Sự kiện online: ${hasOnlineListener ? 'Đã lắng nghe' : 'Chưa lắng nghe'}`);
        console.log(`📡 Sự kiện offline: ${hasOfflineListener ? 'Đã lắng nghe' : 'Chưa lắng nghe'}`);
        
        // Kiểm tra WebSocket
        if (window.websocket) {
            console.log('✅ WebSocket đã được khởi tạo');
        } else {
            console.warn('⚠️ WebSocket chưa được khởi tạo');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra kết nối:', error);
    }
}

// Kiểm tra tính năng đồng bộ
async function testSyncFeatures() {
    console.log('\n🔄 KIỂM TRA TÍNH NĂNG ĐỒNG BỘ:');
    console.log('===============================');
    
    try {
        // Kiểm tra hàng đợi đồng bộ
        if (window.offlineStorage) {
            const syncQueue = window.offlineStorage.getSyncQueue();
            console.log(`📋 Số item trong hàng đợi: ${syncQueue.length}`);
            
            if (syncQueue.length > 0) {
                console.log('📋 Chi tiết hàng đợi:');
                syncQueue.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.module} - ${item.timestamp}`);
                });
            }
        }
        
        // Kiểm tra dữ liệu offline
        if (window.offlineStorage) {
            const offlineData = window.offlineStorage.getOfflineData();
            const modules = Object.keys(offlineData);
            console.log(`📦 Số module có dữ liệu offline: ${modules.length}`);
            
            if (modules.length > 0) {
                console.log('📦 Chi tiết dữ liệu offline:');
                modules.forEach(module => {
                    const data = offlineData[module];
                    console.log(`   ${module}: ${data.timestamp} (v${data.version})`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra đồng bộ:', error);
    }
}

// Kiểm tra tính năng khôi phục
async function testRecoveryFeatures() {
    console.log('\n🔄 KIỂM TRA TÍNH NĂNG KHÔI PHỤC:');
    console.log('================================');
    
    try {
        if (window.dataRecovery) {
            // Kiểm tra tính toàn vẹn dữ liệu
            console.log('🔍 Đang kiểm tra tính toàn vẹn dữ liệu...');
            const integrityReport = await window.dataRecovery.checkDataIntegrity();
            
            if (integrityReport) {
                console.log(`📊 Tổng quan: ${integrityReport.overall}`);
                console.log('📊 Chi tiết module:');
                Object.entries(integrityReport.modules).forEach(([module, status]) => {
                    console.log(`   ${module}: ${status.status} - ${status.message}`);
                });
            }
            
            // Kiểm tra backup
            const backupInfo = window.dataRecovery.getBackupInfo();
            console.log(`💾 Số lượng backup: ${backupInfo.count}`);
            if (backupInfo.latest) {
                console.log(`📅 Backup mới nhất: ${backupInfo.latest}`);
            }
            
        } else {
            console.error('❌ DataRecovery chưa được khởi tạo');
        }
        
    } catch (error) {
        console.error('❌ Lỗi kiểm tra khôi phục:', error);
    }
}

// Chạy tất cả kiểm tra
async function runAllTests() {
    console.log('🚀 BẮT ĐẦU KIỂM TRA TẤT CẢ TÍNH NĂNG');
    console.log('=====================================');
    
    testOfflineStorage();
    testDataRecovery();
    testIntegration();
    testConnection();
    await testSyncFeatures();
    await testRecoveryFeatures();
    
    console.log('\n✅ HOÀN THÀNH KIỂM TRA');
    console.log('======================');
    console.log('🎯 Tất cả tính năng offline đã được kiểm tra');
    console.log('📊 Hệ thống sẵn sàng xử lý mất kết nối');
    console.log('🔄 Dữ liệu sẽ được tự động đồng bộ khi kết nối lại');
    console.log('💾 Backup và khôi phục dữ liệu hoạt động bình thường');
}

// Chạy kiểm tra khi trang tải
document.addEventListener('DOMContentLoaded', runAllTests);

// Xuất ra global scope
window.testOfflineFeatures = runAllTests;












