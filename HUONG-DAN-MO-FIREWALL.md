# 🔥 Hướng dẫn mở Windows Firewall cho Port 8080

## ⚠️ QUAN TRỌNG: Cần quyền Administrator

Để mở port 8080 trong Windows Firewall, bạn **PHẢI** chạy PowerShell hoặc Command Prompt với quyền **Administrator**.

---

## 📋 Cách mở Windows Firewall

### **Bước 1: Mở PowerShell với quyền Administrator**

1. Nhấn phím **Windows** trên bàn phím
2. Gõ: `PowerShell`
3. Click chuột phải vào **Windows PowerShell**
4. Chọn **"Run as administrator"** (Chạy với quyền quản trị)

### **Bước 2: Chạy lệnh mở port 8080**

Copy và paste lệnh này vào PowerShell:

```powershell
netsh advfirewall firewall add rule name="QR Management Server" dir=in action=allow protocol=TCP localport=8080
```

### **Bước 3: Kiểm tra đã mở thành công**

Chạy lệnh này để kiểm tra:

```powershell
netsh advfirewall firewall show rule name="QR Management Server"
```

Nếu thấy rule "QR Management Server" → ✅ **Đã mở thành công!**

---

## 🔍 Kiểm tra server đang chạy trên IP nào

Chạy lệnh này để xem IP hiện tại:

```powershell
ipconfig | findstr IPv4
```

Kết quả sẽ hiển thị IP của máy bạn, ví dụ:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.25
```

**⚠️ LƯU Ý:** Ghi nhớ IP này để cấu hình Port Forwarding!

---

## 🌐 Cập nhật Port Forwarding trên Router

Sau khi đã biết IP của máy (ví dụ: `192.168.1.25`):

1. **Đăng nhập vào router** (thường là `http://192.168.1.1`)
2. **Tìm mục "Port Forwarding"** hoặc **"NAT Forwarding"**
3. **Tìm rule "QRManagement"**
4. **Click nút "Hiệu chỉnh"** (biểu tượng bút chì)
5. **Sửa IP trong** từ `192.168.1.22` → `192.168.1.25` (hoặc IP hiện tại của bạn)
6. **Lưu** cấu hình

---

## ✅ Kiểm tra sau khi cấu hình

### **1. Kiểm tra server từ Local:**

Mở trình duyệt và truy cập:
```
http://localhost:8080
```

Nếu thấy trang web → ✅ Server hoạt động tốt!

### **2. Kiểm tra từ LAN:**

Từ máy khác trong mạng LAN, truy cập:
```
http://[IP-CỦA-MÁY-SERVER]:8080
```

Ví dụ: `http://192.168.1.25:8080`

Nếu thấy trang web → ✅ Firewall đã mở!

### **3. Kiểm tra từ Internet:**

**Quan trọng:** Phải dùng **4G/5G** (không dùng WiFi), hoặc truy cập từ máy khác ngoài mạng của bạn.

Truy cập:
```
http://115.73.163.98:8080
```

Nếu thấy trang web → ✅ Port Forwarding hoạt động!

---

## 🆘 Nếu vẫn không kết nối được từ Internet

### **Kiểm tra các điểm sau:**

1. ✅ **Server có đang chạy không?**
   - Kiểm tra: `netstat -ano | findstr :8080`

2. ✅ **Firewall đã mở chưa?**
   - Chạy: `netsh advfirewall firewall show rule name="QR Management Server"`

3. ✅ **Port Forwarding đã cấu hình đúng IP chưa?**
   - IP trong router phải **TRÙNG KHỚP** với IP máy server

4. ✅ **ISP có chặn port 8080 không?**
   - Một số nhà mạng (VNPT, FPT, Viettel) có thể chặn một số port
   - Thử đổi sang port khác (ví dụ: 8081, 8888)

5. ✅ **Router có chặn kết nối từ Internet không?**
   - Kiểm tra cài đặt bảo mật của router
   - Đảm bảo "WAN Filtering" hoặc "Remote Management" đã được bật

---

## 📞 Ghi chú

- **IP máy có thể thay đổi** nếu dùng DHCP
- **Giải pháp:** Đặt IP tĩnh cho máy server hoặc cập nhật Port Forwarding mỗi khi IP thay đổi
- **IP công cộng (115.73.163.98) có thể thay đổi** nếu không có IP tĩnh từ ISP

**Chúc bạn thành công!** 🚀


