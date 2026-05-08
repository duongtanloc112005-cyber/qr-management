# 🏭 Hệ thống Quản lý QR - QR Management System

## 🚀 Khởi động nhanh

### 1. Khởi động server
```bash
# Cách 1: Sử dụng file batch (khuyến nghị)
auto-start-server.bat

# Cách 2: Sử dụng npm
npm start

# Cách 3: Chạy trực tiếp
node sync-server.js
```

### 2. Truy cập hệ thống
- **Local:** http://localhost:3000
- **LAN:** http://[IP_MÁY_CHỦ]:3000

## 📋 Các module

- **Đóng hàng:** http://localhost:3000/Donghang.html
- **Kho phôi:** http://localhost:3000/Khophoi.html  
- **Sản xuất:** http://localhost:3000/Sanxuat.html
- **Thành phẩm:** http://localhost:3000/Thanhpham.html

## 🛡️ Bảo vệ dữ liệu

### Cơ chế an toàn
- ✅ **Lưu dữ liệu mỗi 5 giây** (siêu nhanh)
- ✅ **Backup mỗi 30 phút** (thường xuyên)
- ✅ **Chỉ mất tối đa 5 giây** dữ liệu khi mất điện
- ✅ **Khôi phục tự động** từ file tạm
- ✅ **Chế độ thủ công** - lưu dữ liệu vô thời hạn

### Kiểm tra an toàn dữ liệu
```bash
# Kiểm tra nhanh
node data-manager.js safety

# Kiểm tra và sửa chữa
node data-manager.js safety
```

## 🔧 Quản lý dữ liệu

### Thống kê dữ liệu
```bash
node data-manager.js stats
```

### Backup và khôi phục
```bash
# Tạo backup
node data-manager.js backup

# Xem danh sách backup
node data-manager.js list

# Khôi phục từ backup
node backup-data.js restore <backup-name>
```

### Dọn dẹp dữ liệu
```bash
# Dọn dẹp thủ công
node data-manager.js cleanup

# Xem cấu hình
node data-manager.js config

# Kiểm tra an toàn
node data-manager.js safety
```

## ⚙️ Cấu hình

### File cấu hình: `data-config.js`
```javascript
// Thời gian lưu trữ
DATA_RETENTION_DAYS: 999,      // Vô thời hạn
MAX_ITEMS_PER_MODULE: 99999,   // Không giới hạn

// Tự động
AUTO_SAVE_INTERVAL: 5000,      // Lưu mỗi 5 giây
AUTO_BACKUP_INTERVAL: 1800000, // Backup mỗi 30 phút
AUTO_CLEANUP_INTERVAL: 0,      // Tắt tự động dọn dẹp
```

## 🎛️ Tính năng UI

### Nút "Xóa toàn bộ"
- Tự động tạo backup trước khi xóa
- Xóa toàn bộ dữ liệu của module
- Đồng bộ với tất cả client

### Thêm nút vào HTML:
```html
<script src="ui-clear-button.js"></script>
```

## 🚀 Tự động khởi động

### Cài đặt startup
```bash
# Quản lý tự động khởi động
startup-manager.bat

# Hoặc chạy với tham số
startup-manager.bat install
startup-manager.bat uninstall
startup-manager.bat status
```

## 📊 Cấu trúc thư mục

```
Quanly/
├── 🚀 Core System
│   ├── sync-server.js          # Server chính
│   ├── auto-start-server.bat   # Khởi động server
│   └── startup-manager.bat     # Quản lý startup
│
├── 📂 Data & Config
│   ├── data/                   # Dữ liệu chính
│   ├── backups/                # Backup tự động
│   ├── data-config.js          # Cấu hình hệ thống
│   └── users.json              # Dữ liệu user
│
├── 🌐 Web Interface
│   ├── Donghang.html           # Trang đóng hàng
│   ├── Khophoi.html            # Trang kho phôi
│   ├── Sanxuat.html            # Trang sản xuất
│   └── Thanhpham.html          # Trang thành phẩm
│
├── 🔧 Management Tools
│   ├── data-manager.js         # Quản lý dữ liệu (gộp)
│   ├── backup-data.js          # Công cụ backup
│   └── ui-clear-button.js      # Nút xóa UI
│
└── 📖 Documentation
    └── README.md               # Hướng dẫn tổng hợp
```

## 🛠️ Khắc phục sự cố

### Nếu server không khởi động
```bash
# Kiểm tra Node.js
node --version

# Cài đặt dependencies
npm install

# Kiểm tra port 3000
netstat -an | findstr :3000
```

### Nếu mất dữ liệu
```bash
# Kiểm tra an toàn
node data-manager.js safety

# Khôi phục từ backup
node backup-data.js list
node backup-data.js restore <backup-name>
```

### Nếu hệ thống chậm
```bash
# Kiểm tra kích thước dữ liệu
node data-manager.js stats

# Dọn dẹp nếu cần
node data-manager.js cleanup
```

## 📞 Hỗ trợ

- **Kiểm tra log:** Xem console khi chạy server
- **Kiểm tra dữ liệu:** `node data-manager.js safety`
- **Backup dữ liệu:** `node data-manager.js backup`
- **Khôi phục:** `node backup-data.js list`

---

**Hệ thống QR Management - An toàn, nhanh chóng, đáng tin cậy!** 🛡️✨
