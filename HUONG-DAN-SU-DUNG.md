# 🚀 Hướng dẫn sử dụng - QR Management System

## 📁 Cấu trúc file đã được sắp xếp lại

Các file đã được tổ chức lại thành các thư mục để dễ quản lý hơn.

---

## 🎯 Cách chạy server

### **Cách 1: Dùng file ở thư mục gốc (Khuyến nghị)**

Double-click file:
```
start-server.bat
```

File này sẽ tự động gọi script trong thư mục `scripts/` để khởi động server.

### **Cách 2: Chạy trực tiếp từ scripts**

```
scripts\start-server-port-8080.bat
```

---

## 📂 Cấu trúc thư mục

### **Thư mục gốc:**
Chứa các file core của hệ thống:
- `start-server.bat` - **File chính để khởi động server** ⭐
- `sync-server.js` - Server chính
- `sync-server-external.js` - Server với external access
- `package.json` - Dependencies
- `README.md` - Hướng dẫn tổng hợp

### **`scripts/` - Scripts và tools:**
- `start-server-port-8080.bat` - Khởi động server port 8080
- `start-external.bat` - Khởi động server port 3000
- `fix-*.bat` - Các script khắc phục lỗi
- `test-connection.bat` - Kiểm tra kết nối
- Các script khác...

### **`docs/` - Tài liệu hướng dẫn:**
- `CACH-CHAY-SERVER.md` - Cách chạy server
- `HUONG-DAN-PORT-FORWARDING.md` - Hướng dẫn port forwarding
- `HUONG-DAN-FIX-*.md` - Khắc phục các lỗi
- Các file hướng dẫn khác...

### **`html/` - Các file HTML:**
- `index.html` - Trang chủ
- `Donghang.html` - Module Đóng hàng
- `Khophoi.html` - Module Kho phôi
- `Sanxuat.html` - Module Sản xuất
- `Thanhpham.html` - Module Thành phẩm

---

## 🔍 Tìm file

### **Muốn chạy script?**
→ Vào thư mục `scripts/`

### **Muốn xem hướng dẫn?**
→ Vào thư mục `docs/`

### **Muốn chỉnh sửa HTML?**
→ Vào thư mục `html/`

---

## ✅ Lợi ích của cấu trúc mới

- ✅ **Dễ tìm:** File được phân loại rõ ràng
- ✅ **Dễ quản lý:** Mỗi loại file ở thư mục riêng
- ✅ **Gọn gàng:** Thư mục gốc không còn lộn xộn
- ✅ **Bảo trì dễ:** Dễ thêm/sửa/xóa file

---

**Chúc bạn sử dụng thuận tiện!** 🎉

