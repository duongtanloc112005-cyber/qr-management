# 🔍 Kiểm tra Port Forwarding - Port 8080

## ⚠️ VẤN ĐỀ HIỆN TẠI

**Không truy cập được:** `http://27.68.69.140:8080`

## 📋 Thông tin Server

- **IP Công cộng:** `27.68.69.140` ✅
- **IP Local:** `192.168.1.33` ⚠️ **LƯU Ý: IP đã thay đổi!**
- **Port:** `8080`
- **Firewall:** Đã mở port 8080 ✅
- **Server:** Đang chạy ✅

## 🔧 NGUYÊN NHÂN CÓ THỂ

### 1. Port Forwarding chưa cấu hình hoặc SAI IP Local

**IP trong tài liệu:** `192.168.1.22` (SAI)
**IP thực tế hiện tại:** `192.168.1.33` (ĐÚNG)

👉 **CẦN CẬP NHẬT PORT FORWARDING TRÊN ROUTER**

### 2. Cấu hình Port Forwarding đúng:

```
Tên rule: QRManagement (hoặc tên tùy chọn)
Protocol: TCP
Port ngoài (External Port): 8080
Port trong (Internal Port): 8080
IP trong (Internal IP): 192.168.1.33 ⚠️ ĐÚNG IP HIỆN TẠI
Status: Enabled
```

## 🛠️ CÁCH SỬA

### Bước 1: Kiểm tra Port Forwarding trên Router

1. Đăng nhập vào router (thường là `192.168.1.1` hoặc `192.168.0.1`)
2. Tìm mục "Port Forwarding" hoặc "Virtual Server" hoặc "NAT"
3. Kiểm tra rule cho port 8080:
   - **IP trong phải là:** `192.168.1.33` (KHÔNG phải `192.168.1.22`)
   - **Port phải là:** `8080`
   - **Status phải là:** Enabled

### Bước 2: Cập nhật hoặc tạo rule mới

Nếu rule đang trỏ đến IP cũ (`192.168.1.22`):
- **Xóa rule cũ**
- **Tạo rule mới** với IP đúng (`192.168.1.33`)

Hoặc:
- **Sửa rule hiện tại** để đổi IP từ `192.168.1.22` → `192.168.1.33`

### Bước 3: Lưu và khởi động lại router (nếu cần)

Một số router cần:
- Click "Apply" hoặc "Save"
- Khởi động lại router

### Bước 4: Kiểm tra lại

1. **Từ máy local:**
   ```
   http://localhost:8080
   ```
   ✅ Phải hoạt động

2. **Từ máy khác trong LAN:**
   ```
   http://192.168.1.33:8080
   ```
   ✅ Phải hoạt động

3. **Từ Internet (dùng 4G trên điện thoại):**
   ```
   http://27.68.69.140:8080
   ```
   ✅ Phải hoạt động sau khi cấu hình đúng

## ⚠️ CÁC TRƯỜNG HỢP KHÁC

### ISP có thể chặn port 8080

Nếu sau khi cấu hình đúng mà vẫn không được:
- Thử đổi sang port khác (ví dụ: 8888, 9000)
- Hoặc liên hệ ISP để hỏi về port forwarding

### IP công cộng thay đổi (Dynamic IP)

Nếu IP công cộng thay đổi:
- IP hiện tại: `27.68.69.140`
- Có thể thay đổi khi router khởi động lại
- Giải pháp: Cấu hình Dynamic DNS (DDNS)

### Router có NAT/Firewall chặn

Một số router có:
- NAT chặn kết nối từ Internet
- Firewall chặn port 8080
- Giải pháp: Kiểm tra cài đặt NAT/Firewall trên router

## 📞 HƯỚNG DẪN CHI TIẾT

### Kiểm tra từ Router Admin Panel:

1. Đăng nhập: `http://192.168.1.1` (hoặc IP router của bạn)
2. Tìm: **Port Forwarding / Virtual Server / NAT**
3. Kiểm tra rule:
   ```
   Name: QRManagement
   External Port: 8080
   Internal Port: 8080
   Internal IP: 192.168.1.33 ← PHẢI ĐÚNG
   Protocol: TCP
   Status: Enabled
   ```

## ✅ CHECKLIST

- [ ] Server đang chạy trên port 8080
- [ ] Firewall Windows đã mở port 8080
- [ ] IP Local đúng là `192.168.1.33`
- [ ] Port Forwarding trên router đã cấu hình đúng IP (`192.168.1.33`)
- [ ] Port Forwarding đã được bật (Enabled)
- [ ] Router đã được lưu cấu hình và khởi động lại (nếu cần)
- [ ] Đã test từ LAN (`http://192.168.1.33:8080`)
- [ ] Đã test từ Internet (`http://27.68.69.140:8080`)

