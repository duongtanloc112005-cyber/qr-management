# 🔧 Hướng dẫn sửa Port Forwarding

## ⚠️ VẤN ĐỀ

**Không truy cập được:** `http://27.68.69.140:8080`

## 🔍 NGUYÊN NHÂN

**IP Local đã thay đổi:**
- **IP trong tài liệu cũ:** `192.168.1.22` ❌
- **IP thực tế hiện tại:** `192.168.1.33` ✅

Port Forwarding trên router đang trỏ đến IP cũ (`192.168.1.22`) nên không truy cập được từ Internet.

## ✅ GIẢI PHÁP

### **Cập nhật Port Forwarding trên Router**

#### Bước 1: Đăng nhập Router

1. Mở trình duyệt
2. Truy cập: `http://192.168.1.1` (hoặc IP router của bạn)
3. Đăng nhập bằng username/password

#### Bước 2: Tìm mục Port Forwarding

Tên mục có thể là:
- **Port Forwarding**
- **Virtual Server**
- **NAT**
- **Port Mapping**
- **Applications & Gaming** (Linksys)
- **Advanced → NAT Forwarding** (TP-Link)

#### Bước 3: Tìm và sửa rule cho port 8080

Tìm rule có:
- Port: `8080`
- IP hiện tại: `192.168.1.22` (SAI)

**Sửa thành:**
- **IP trong (Internal IP):** `192.168.1.33` ✅
- **Port trong (Internal Port):** `8080`
- **Port ngoài (External Port):** `8080`
- **Protocol:** `TCP`
- **Status:** `Enabled`

#### Bước 4: Lưu cấu hình

1. Click **"Apply"** hoặc **"Save"**
2. Khởi động lại router (nếu được yêu cầu)

## 🧪 KIỂM TRA SAU KHI SỬA

### 1. Kiểm tra từ máy local
```
http://localhost:8080
```
✅ Phải hoạt động

### 2. Kiểm tra từ máy khác trong LAN
```
http://192.168.1.33:8080
```
✅ Phải hoạt động

### 3. Kiểm tra từ Internet
**Tắt WiFi, bật 4G trên điện thoại, truy cập:**
```
http://27.68.69.140:8080
```
✅ Phải hoạt động sau khi sửa Port Forwarding

## ⚠️ LƯU Ý QUAN TRỌNG

### IP Local có thể thay đổi

Nếu router dùng DHCP động, IP local có thể thay đổi khi:
- Khởi động lại router
- Khởi động lại máy tính
- Hết hạn DHCP lease

**Giải pháp:**
1. **Cấu hình IP tĩnh (Static IP)** trên router:
   - Gán IP cố định `192.168.1.33` cho MAC address của máy tính
   
2. **Hoặc kiểm tra IP trước khi sửa Port Forwarding:**
   - Chạy: `ipconfig` để xem IP hiện tại
   - Cập nhật Port Forwarding nếu IP thay đổi

## 📱 CÁC TRƯỜNG HỢP KHÁC

### ISP chặn port 8080

Nếu đã cấu hình đúng mà vẫn không được:
- Thử đổi sang port khác (ví dụ: `8888`, `9000`)
- Liên hệ ISP để hỏi về port forwarding

### Router có NAT chặn

Một số router cần:
- Bật **"Enable NAT"** hoặc **"Enable UPnP"**
- Tắt **"Stealth Mode"** (nếu có)

### Test nhanh từ bên ngoài

Sử dụng tool online:
- https://www.yougetsignal.com/tools/open-ports/
- Nhập IP: `27.68.69.140`
- Nhập Port: `8080`
- Click "Check"

## ✅ CHECKLIST

- [ ] Đã đăng nhập router
- [ ] Đã tìm mục Port Forwarding
- [ ] Đã tìm thấy rule port 8080
- [ ] Đã sửa IP trong thành `192.168.1.33`
- [ ] Đã lưu cấu hình
- [ ] Đã khởi động lại router (nếu cần)
- [ ] Đã test từ LAN: `http://192.168.1.33:8080`
- [ ] Đã test từ Internet: `http://27.68.69.140:8080`

## 📞 HỖ TRỢ

Nếu vẫn không được sau khi làm theo hướng dẫn:
1. Kiểm tra log router (nếu có)
2. Thử port khác (8888, 9000)
3. Kiểm tra ISP có chặn port không
4. Liên hệ nhà cung cấp router để được hỗ trợ

