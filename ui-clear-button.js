// 🗑️ Nút "Xóa toàn bộ" cho UI
// Thêm vào file HTML của từng module

function addClearAllButton() {
    // Tạo nút xóa toàn bộ
    const clearButton = document.createElement('button');
    clearButton.id = 'clearAllBtn';
    clearButton.className = 'btn btn-danger';
    clearButton.innerHTML = '🗑️ Xóa toàn bộ';
    clearButton.style.margin = '10px';
    clearButton.style.padding = '10px 20px';
    clearButton.style.fontSize = '16px';
    clearButton.style.borderRadius = '5px';
    clearButton.style.border = 'none';
    clearButton.style.backgroundColor = '#dc3545';
    clearButton.style.color = 'white';
    clearButton.style.cursor = 'pointer';
    
    // Thêm sự kiện click
    clearButton.addEventListener('click', function() {
        if (confirm('⚠️ Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu?\n\nDữ liệu sẽ được backup trước khi xóa.')) {
            if (confirm('🚨 XÁC NHẬN LẦN CUỐI:\n\nBạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu?')) {
                clearAllData();
            }
        }
    });
    
    // Thêm vào trang
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(clearButton, container.firstChild);
    
    console.log('✅ Clear All button added to UI');
}

// 🗑️ Hàm xóa toàn bộ dữ liệu
function clearAllData() {
    console.log('🗑️ Clearing all data...');
    
    // Hiển thị loading
    const clearBtn = document.getElementById('clearAllBtn');
    const originalText = clearBtn.innerHTML;
    clearBtn.innerHTML = '⏳ Đang xóa...';
    clearBtn.disabled = true;
    
    // Gửi lệnh xóa đến server
    if (window.websocket && window.websocket.readyState === WebSocket.OPEN) {
        // Lấy module hiện tại từ URL hoặc cấu hình
        const module = getCurrentModule();
        
        window.websocket.send(JSON.stringify({
            type: 'clear_all_data',
            module: module
        }));
        
        console.log(`🗑️ Clear all data request sent for module: ${module}`);
    } else {
        console.error('❌ WebSocket not connected');
        alert('❌ Không thể kết nối đến server');
        clearBtn.innerHTML = originalText;
        clearBtn.disabled = false;
    }
}

// 📡 Xử lý phản hồi từ server
function handleClearResponse(data) {
    if (data.type === 'clear_completed') {
        console.log('✅ Clear completed:', data.message);
        
        // Cập nhật UI
        updateUI([]);
        
        // Hiển thị thông báo
        alert('✅ Đã xóa toàn bộ dữ liệu thành công!');
        
        // Khôi phục nút
        const clearBtn = document.getElementById('clearAllBtn');
        clearBtn.innerHTML = '🗑️ Xóa toàn bộ';
        clearBtn.disabled = false;
        
    } else if (data.type === 'error') {
        console.error('❌ Clear failed:', data.message);
        alert('❌ Lỗi khi xóa dữ liệu: ' + data.message);
        
        // Khôi phục nút
        const clearBtn = document.getElementById('clearAllBtn');
        clearBtn.innerHTML = '🗑️ Xóa toàn bộ';
        clearBtn.disabled = false;
    }
}

// 🔍 Lấy module hiện tại
function getCurrentModule() {
    // Kiểm tra URL để xác định module
    const path = window.location.pathname;
    
    if (path.includes('donghang')) return 'donghang';
    if (path.includes('khophoi')) return 'khophoi';
    if (path.includes('sanxuat')) return 'sanxuat';
    if (path.includes('thanhpham')) return 'thanhpham';
    
    // Fallback: kiểm tra title hoặc nội dung trang
    const title = document.title.toLowerCase();
    if (title.includes('đóng hàng')) return 'donghang';
    if (title.includes('kho phôi')) return 'khophoi';
    if (title.includes('sản xuất')) return 'sanxuat';
    if (title.includes('thành phẩm')) return 'thanhpham';
    
    // Mặc định
    return 'donghang';
}

// 🔄 Cập nhật UI sau khi xóa
function updateUI(emptyData) {
    // Xóa tất cả dữ liệu hiện tại
    const tableBody = document.querySelector('tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
    
    // Cập nhật số lượng
    const countElement = document.querySelector('.count');
    if (countElement) {
        countElement.textContent = '0';
    }
    
    // Cập nhật danh sách dữ liệu
    if (window.dataList) {
        window.dataList = emptyData;
    }
    
    console.log('✅ UI updated after clear');
}

// 🚀 Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Thêm nút xóa toàn bộ
    addClearAllButton();
    
    // Lắng nghe phản hồi từ server
    if (window.websocket) {
        const originalOnMessage = window.websocket.onmessage;
        window.websocket.onmessage = function(event) {
            const data = JSON.parse(event.data);
            
            // Xử lý phản hồi xóa dữ liệu
            if (data.type === 'clear_completed' || data.type === 'error') {
                handleClearResponse(data);
            }
            
            // Gọi hàm xử lý gốc
            if (originalOnMessage) {
                originalOnMessage.call(this, event);
            }
        };
    }
    
    console.log('✅ Clear All button initialized');
});

// 📋 Hướng dẫn sử dụng
console.log(`
🗑️ Clear All Button - Hướng dẫn sử dụng
========================================

1. Nút "Xóa toàn bộ" đã được thêm vào giao diện
2. Nhấn nút để xóa toàn bộ dữ liệu của module hiện tại
3. Hệ thống sẽ tự động tạo backup trước khi xóa
4. Dữ liệu sẽ được đồng bộ với tất cả client

⚠️ Lưu ý: Thao tác này không thể hoàn tác!
💾 Backup sẽ được tạo tự động trước khi xóa
`);



