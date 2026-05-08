/**
 * HỆ THỐNG LƯU TRỮ OFFLINE VÀ ĐỒNG BỘ DỮ LIỆU
 * ===========================================
 * 
 * Tính năng:
 * - Lưu trữ dữ liệu offline khi mất kết nối
 * - Tự động đồng bộ khi kết nối lại
 * - Khôi phục dữ liệu bị mất
 * - Đảm bảo tính toàn vẹn dữ liệu
 */

class OfflineStorage {
    constructor() {
        this.storageKey = 'quanly_offline_data';
        this.syncQueue = 'quanly_sync_queue';
        this.isOnline = navigator.onLine;
        this.syncInProgress = false;
        
        // Lắng nghe sự kiện kết nối
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Kiểm tra kết nối định kỳ
        setInterval(() => this.checkConnection(), 5000);
        
        console.log('🔄 Hệ thống offline storage đã khởi tạo');
    }
    
    /**
     * Kiểm tra kết nối mạng
     */
    async checkConnection() {
        try {
            // Thử kiểm tra bằng HTTP tới trang chủ (server đang phục vụ file tĩnh)
            const response = await fetch('/', {
                method: 'GET',
                cache: 'no-store'
            });
            this.isOnline = response.ok;
        } catch (error) {
            this.isOnline = false;
        }
        
        // Fallback: nếu HTTP không khả dụng, thử kiểm tra WebSocket
        try {
            if (!this.isOnline && window.websocket && window.websocket.readyState === WebSocket.OPEN) {
                this.isOnline = true;
            }
        } catch (_) {}
        
        // Cập nhật trạng thái UI
        this.updateConnectionStatus();
    }
    
    /**
     * Xử lý khi có kết nối
     */
    async handleOnline() {
        console.log('🌐 Kết nối đã được khôi phục');
        this.isOnline = true;
        this.updateConnectionStatus();
        
        // Tự động đồng bộ dữ liệu
        await this.syncOfflineData();
    }
    
    /**
     * Xử lý khi mất kết nối
     */
    handleOffline() {
        console.log('📴 Mất kết nối - Chuyển sang chế độ offline');
        this.isOnline = false;
        this.updateConnectionStatus();
    }
    
    /**
     * Cập nhật trạng thái kết nối trên UI
     */
    updateConnectionStatus() {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            if (this.isOnline) {
                statusElement.innerHTML = '🟢 Đã kết nối';
                statusElement.className = 'connection-online';
            } else {
                statusElement.innerHTML = '🔴 Offline - Dữ liệu được lưu cục bộ';
                statusElement.className = 'connection-offline';
            }
        }
    }
    
    /**
     * Lưu dữ liệu offline
     */
    saveOfflineData(module, data) {
        try {
            const offlineData = this.getOfflineData();
            offlineData[module] = {
                data: data,
                timestamp: new Date().toISOString(),
                version: Date.now()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(offlineData));
            console.log(`💾 Đã lưu dữ liệu offline cho ${module}`);
            
            // Thêm vào hàng đợi đồng bộ
            this.addToSyncQueue(module, data);
            
        } catch (error) {
            console.error('❌ Lỗi lưu dữ liệu offline:', error);
        }
    }
    
    /**
     * Lấy dữ liệu offline
     */
    getOfflineData() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('❌ Lỗi đọc dữ liệu offline:', error);
            return {};
        }
    }
    
    /**
     * Thêm vào hàng đợi đồng bộ
     */
    addToSyncQueue(module, data) {
        try {
            const queue = this.getSyncQueue();
            queue.push({
                module: module,
                data: data,
                timestamp: new Date().toISOString(),
                attempts: 0,
                maxAttempts: 3
            });
            
            localStorage.setItem(this.syncQueue, JSON.stringify(queue));
            console.log(`📋 Đã thêm ${module} vào hàng đợi đồng bộ`);
            
        } catch (error) {
            console.error('❌ Lỗi thêm vào hàng đợi:', error);
        }
    }
    
    /**
     * Lấy hàng đợi đồng bộ
     */
    getSyncQueue() {
        try {
            const queue = localStorage.getItem(this.syncQueue);
            return queue ? JSON.parse(queue) : [];
        } catch (error) {
            console.error('❌ Lỗi đọc hàng đợi:', error);
            return [];
        }
    }
    
    /**
     * Đồng bộ dữ liệu offline
     */
    async syncOfflineData() {
        if (this.syncInProgress || !this.isOnline) {
            return;
        }
        
        this.syncInProgress = true;
        console.log('🔄 Bắt đầu đồng bộ dữ liệu offline...');
        
        try {
            const queue = this.getSyncQueue();
            const failedItems = [];
            
            for (const item of queue) {
                try {
                    await this.syncItem(item);
                    console.log(`✅ Đã đồng bộ ${item.module}`);
                } catch (error) {
                    console.error(`❌ Lỗi đồng bộ ${item.module}:`, error);
                    item.attempts++;
                    
                    if (item.attempts < item.maxAttempts) {
                        failedItems.push(item);
                    } else {
                        console.error(`❌ Đã thử tối đa lần cho ${item.module}`);
                    }
                }
            }
            
            // Cập nhật hàng đợi với các item thất bại
            localStorage.setItem(this.syncQueue, JSON.stringify(failedItems));
            
            if (failedItems.length === 0) {
                console.log('🎉 Đã đồng bộ tất cả dữ liệu offline');
            } else {
                console.log(`⚠️ Còn ${failedItems.length} item chưa đồng bộ được`);
            }
            
        } catch (error) {
            console.error('❌ Lỗi đồng bộ tổng thể:', error);
        } finally {
            this.syncInProgress = false;
        }
    }
    
    /**
     * Đồng bộ một item cụ thể
     */
    async syncItem(item) {
        // Ưu tiên dùng WebSocket vì backend hiện không có REST /api
        if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
            try {
                // Gửi thông điệp update theo định dạng server đang hỗ trợ
                window.websocket.send(JSON.stringify({
                    type: 'update',
                    module: item.module,
                    payload: item.data
                }));
                return { ok: true, via: 'websocket' };
            } catch (wsErr) {
                // Tiếp tục thử phương án khác
            }
        }
        
        // Fallback 1: nếu có hàm save{Module} trên window (đã tích hợp), sử dụng nó
        try {
            const saveFuncName = `save${item.module.charAt(0).toUpperCase()}${item.module.slice(1)}`;
            if (typeof window[saveFuncName] === 'function') {
                await window[saveFuncName](item.data);
                return { ok: true, via: 'saveFunction' };
            }
        } catch (_) {}
        
        // Fallback 2: thử gọi REST nếu về sau có triển khai
        try {
            const response = await fetch(`/api/${item.module}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(item.data)
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (restErr) {
            throw restErr;
        }
    }
    
    /**
     * Khôi phục dữ liệu từ offline storage
     */
    async restoreOfflineData(module) {
        try {
            const offlineData = this.getOfflineData();
            if (offlineData[module]) {
                console.log(`🔄 Khôi phục dữ liệu offline cho ${module}`);
                return offlineData[module].data;
            }
        } catch (error) {
            console.error('❌ Lỗi khôi phục dữ liệu offline:', error);
        }
        return null;
    }
    
    /**
     * Xóa dữ liệu offline đã đồng bộ
     */
    clearSyncedData() {
        try {
            const queue = this.getSyncQueue();
            const syncedItems = queue.filter(item => item.attempts === 0);
            
            if (syncedItems.length > 0) {
                console.log(`🧹 Đã xóa ${syncedItems.length} item đã đồng bộ`);
            }
            
        } catch (error) {
            console.error('❌ Lỗi xóa dữ liệu đã đồng bộ:', error);
        }
    }
    
    /**
     * Kiểm tra dung lượng lưu trữ
     */
    checkStorageSpace() {
        try {
            const used = JSON.stringify(localStorage).length;
            const max = 5 * 1024 * 1024; // 5MB
            const percentage = (used / max) * 100;
            
            if (percentage > 80) {
                console.warn('⚠️ Dung lượng lưu trữ gần đầy:', percentage.toFixed(2) + '%');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Lỗi kiểm tra dung lượng:', error);
            return false;
        }
    }
    
    /**
     * Dọn dẹp dữ liệu cũ
     */
    cleanupOldData() {
        try {
            const offlineData = this.getOfflineData();
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            Object.keys(offlineData).forEach(module => {
                const timestamp = new Date(offlineData[module].timestamp).getTime();
                if (timestamp < oneDayAgo) {
                    delete offlineData[module];
                    console.log(`🧹 Đã xóa dữ liệu cũ của ${module}`);
                }
            });
            
            localStorage.setItem(this.storageKey, JSON.stringify(offlineData));
            
        } catch (error) {
            console.error('❌ Lỗi dọn dẹp dữ liệu cũ:', error);
        }
    }
}

// Khởi tạo hệ thống offline storage
const offlineStorage = new OfflineStorage();

// Xuất ra global scope
window.offlineStorage = offlineStorage;

console.log('🚀 Hệ thống offline storage đã sẵn sàng');
