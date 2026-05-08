# 📁 Cấu trúc thư mục - QR Management System

## 🎯 Tổng quan

Các file đã được sắp xếp lại để dễ quản lý và tìm kiếm hơn.

---

## 📂 Cấu trúc thư mục

```
Quanly/
├── 📄 Core Files (Thư mục gốc)
│   ├── sync-server.js              # Server chính (port 3000)
│   ├── sync-server-external.js     # Server external access
│   ├── package.json                # Dependencies
│   ├── start-server.bat            # ⭐ File chính để khởi động server
│   └── README.md                   # Hướng dẫn tổng hợp
│
├── 📂 scripts/                     # Tất cả các script .bat
│   ├── start-server-port-8080.bat  # Khởi động server port 8080
│   ├── start-external.bat          # Khởi động server external (port 3000)
│   ├── auto-start-server.bat       # Khởi động server tự động
│   ├── fix-port-forwarding.bat     # Khắc phục lỗi port forwarding
│   ├── fix-port-trong.bat          # Khắc phục lỗi port trong
│   ├── fix-ten-mapping.bat         # Khắc phục lỗi tên mapping
│   ├── port-forwarding-setup.bat   # Cấu hình port forwarding
│   ├── ngrok-setup.bat             # Setup Ngrok tunnel
│   ├── test-connection.bat         # Test kết nối
│   └── startup-manager.bat         # Quản lý tự động khởi động
│
├── 📂 docs/                        # Tất cả các file hướng dẫn .md
│   ├── CACH-CHAY-SERVER.md         # Cách chạy server
│   ├── HUONG-DAN-PORT-FORWARDING.md
│   ├── HUONG-DAN-FIX-LOI-PORT.md
│   ├── HUONG-DAN-FIX-PORT-TRONG.md
│   ├── HUONG-DAN-FIX-TEN-MAPPING.md
│   ├── HUONG-DAN-HOAN-THANH-PORT-FORWARDING.md
│   ├── EXTERNAL-ACCESS-GUIDE.md
│   ├── PORT-FORWARDING-GUIDE.md
│   ├── OFFLINE-FEATURES-GUIDE.md
│   ├── UI-UPGRADE-GUIDE.md
│   └── OPTIMIZATION_REPORT.md
│
├── 📂 html/                        # Tất cả các file HTML
│   ├── index.html                  # Trang chủ
│   ├── Donghang.html               # Module Đóng hàng
│   ├── Khophoi.html                # Module Kho phôi
│   ├── Sanxuat.html                # Module Sản xuất
│   ├── Thanhpham.html              # Module Thành phẩm
│   └── offline-test.html           # Test offline features
│
├── 📂 data/                        # Dữ liệu hệ thống
│   ├── donghang.json
│   ├── khophoi.json
│   ├── sanxuat.json
│   └── thanhpham.json
│
├── 📂 backups/                     # Backup tự động
│   └── [backup files]
│
└── 📂 assets/                      # CSS, JS, images
    ├── css/
    └── js/
```

---

## 🚀 Cách sử dụng

### **Khởi động server:**

**Cách 1: Double-click file ở thư mục gốc:**
```
start-server.bat
```

**Cách 2: Chạy trực tiếp từ scripts:**
```
scripts\start-server-port-8080.bat
```

### **Xem hướng dẫn:**

Tất cả các file hướng dẫn nằm trong thư mục `docs\`:
- Cách chạy server: `docs\CACH-CHAY-SERVER.md`
- Port forwarding: `docs\HUONG-DAN-PORT-FORWARDING.md`
- Khắc phục sự cố: `docs\HUONG-DAN-FIX-*.md`

### **Chạy các script khác:**

Tất cả script nằm trong thư mục `scripts\`:
```
scripts\port-forwarding-setup.bat
scripts\test-connection.bat
scripts\fix-port-forwarding.bat
```

---

## 📋 Các file quan trọng

### **Files chính (thư mục gốc):**
- `start-server.bat` - **File chính để khởi động server** ⭐
- `sync-server-external.js` - Server code
- `package.json` - Dependencies
- `README.md` - Hướng dẫn tổng hợp

### **Scripts (scripts/):**
- `start-server-port-8080.bat` - Khởi động server port 8080
- `fix-*.bat` - Khắc phục các lỗi thường gặp
- `test-connection.bat` - Kiểm tra kết nối

### **Hướng dẫn (docs/):**
- `CACH-CHAY-SERVER.md` - Cách chạy server
- `HUONG-DAN-PORT-FORWARDING.md` - Hướng dẫn port forwarding
- Các file `HUONG-DAN-FIX-*.md` - Khắc phục sự cố

---

## 🔄 Thay đổi so với trước

### **Trước đây:**
- Tất cả file nằm lộn xộn trong thư mục gốc
- Khó tìm file cần thiết
- Khó quản lý

### **Bây giờ:**
- ✅ File được phân loại vào thư mục:
  - `scripts/` - Tất cả file .bat
  - `docs/` - Tất cả file hướng dẫn .md
  - `html/` - Tất cả file HTML
- ✅ File `start-server.bat` ở thư mục gốc để dễ tìm
- ✅ Dễ quản lý và bảo trì

---

## ⚠️ Lưu ý

1. **Server vẫn hoạt động bình thường:**
   - File `start-server.bat` tự động gọi script trong `scripts/`
   - Server vẫn truy cập được file HTML trong `html/`

2. **Đường dẫn file:**
   - Server đã được cấu hình để tìm file HTML trong thư mục `html/`
   - Không cần thay đổi gì khi truy cập

3. **Scripts:**
   - Tất cả scripts vẫn hoạt động bình thường
   - Chỉ cần chạy từ thư mục gốc hoặc chỉ định đường dẫn đúng

---

## 📞 Trợ giúp

Nếu có vấn đề:
1. Xem file `README.md` ở thư mục gốc
2. Xem các file hướng dẫn trong `docs/`
3. Chạy script khắc phục trong `scripts/`

---

**Cấu trúc đã được sắp xếp gọn gàng và dễ quản lý hơn!** ✨
