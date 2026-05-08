# 📋 HƯỚNG DẪN CÀI ĐẶT NÂNG CẤP BẢO MẬT

## 🚀 BƯỚC 1: CÀI ĐẶT DEPENDENCIES

```bash
npm install
```

Các package mới được thêm:
- `bcrypt`: Hash passwords
- `joi`: Input validation
- `express`: HTTP server và API
- `express-rate-limit`: Rate limiting
- `winston`: Structured logging

---

## 🔐 BƯỚC 2: MIGRATE PASSWORDS

**⚠️ QUAN TRỌNG:** Backup file `users.json` trước khi chạy!

```bash
# Tạo backup thủ công (khuyến nghị)
copy users.json users.json.backup

# Chạy script migrate
node migrate-passwords.js
```

Script sẽ:
- ✅ Tạo backup tự động: `users.json.backup`
- ✅ Hash tất cả passwords với bcrypt
- ✅ Lưu file mới

**Lưu ý:** 
- Script hỗ trợ backward compatibility (có thể verify cả password cũ và mới)
- Sau khi migrate, passwords cũ vẫn hoạt động trong 1 lần đăng nhập đầu tiên

---

## 🧪 BƯỚC 3: TEST HỆ THỐNG

### 3.1. Khởi động server

```bash
npm start
```

Hoặc:

```bash
node sync-server.js
```

### 3.2. Test đăng nhập

1. Mở trình duyệt: `http://localhost:3000`
2. Vào một module bất kỳ (ví dụ: Kho Phôi)
3. Đăng nhập với username/password cũ
4. Kiểm tra xem có đăng nhập được không

### 3.3. Test API

```bash
# Test login API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"0123","moduleName":"tonghop"}'
```

Kết quả mong đợi:
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

---

## ✅ KIỂM TRA SAU KHI CÀI ĐẶT

### 1. Kiểm tra logs

```bash
# Xem error logs
type logs\error.log

# Xem combined logs
type logs\combined.log
```

### 2. Kiểm tra rate limiting

Thử đăng nhập sai password 6 lần liên tiếp → Nên bị chặn với message "Quá nhiều lần thử đăng nhập"

### 3. Kiểm tra validation

Thử gửi dữ liệu không hợp lệ qua WebSocket → Nên nhận error message

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Cannot find module 'bcrypt'"

**Giải pháp:**
```bash
npm install bcrypt
```

### Lỗi: "Cannot find module 'express'"

**Giải pháp:**
```bash
npm install express express-rate-limit joi winston
```

### Lỗi: "Port 3000 already in use"

**Giải pháp:**
- Đóng server cũ
- Hoặc đổi port trong `sync-server.js`:
```javascript
const PORT = process.env.PORT || 3001; // Đổi port
```

### Lỗi đăng nhập sau khi migrate

**Giải pháp:**
1. Kiểm tra file `users.json` có passwords đã được hash (length > 60)
2. Kiểm tra server logs: `logs/error.log`
3. Restore từ backup nếu cần:
```bash
copy users.json.backup users.json
```

### WebSocket không kết nối được

**Giải pháp:**
- Kiểm tra server đang chạy
- Kiểm tra firewall
- Kiểm tra console browser để xem lỗi

---

## 📊 CÁC TÍNH NĂNG MỚI

### ✅ Đã thêm:

1. **Password Hashing:**
   - Passwords được hash với bcrypt (salt rounds: 10)
   - Không còn lưu plaintext

2. **API Authentication:**
   - Endpoint: `/api/auth/login`
   - Endpoint: `/api/auth/check`
   - Session-based (24 giờ)

3. **Rate Limiting:**
   - API: 100 requests / 15 phút
   - Login: 5 attempts / 15 phút

4. **Input Validation:**
   - Validate tất cả WebSocket messages
   - Validate API requests
   - Sanitize input để ngăn XSS

5. **Logging:**
   - Structured logging với Winston
   - Logs lưu trong `logs/` directory
   - Error logs riêng biệt

---

## 🔄 ROLLBACK (Nếu cần)

Nếu gặp vấn đề và cần rollback:

```bash
# 1. Dừng server
# Ctrl+C

# 2. Restore users.json
copy users.json.backup users.json

# 3. Xóa dependencies mới (tùy chọn)
# Giữ lại để tương lai có thể dùng lại

# 4. Khởi động lại server cũ (nếu có backup)
```

---

## 📝 GHI CHÚ

- **Backward Compatibility:** Hệ thống vẫn hỗ trợ passwords cũ trong lần đăng nhập đầu tiên
- **Session:** Session hợp lệ trong 24 giờ, sau đó cần đăng nhập lại
- **Logs:** Logs được lưu tự động, có thể xóa định kỳ để tiết kiệm dung lượng

---

## 🎯 BƯỚC TIẾP THEO

Sau khi hoàn thành Giai đoạn 1, có thể tiếp tục:
- Giai đoạn 2: Database migration
- Giai đoạn 3: REST API đầy đủ
- Giai đoạn 4: Testing & Documentation

Xem `BAO-CAO-PHAN-TICH-HE-THONG.md` để biết chi tiết.

---

**Cập nhật:** 2025-01-14








