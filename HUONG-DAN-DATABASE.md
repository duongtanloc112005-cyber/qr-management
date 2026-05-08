# 🗄️ HƯỚNG DẪN MIGRATE SANG DATABASE

## 🎯 TẠI SAO DÙNG DATABASE?

- ✅ **Nhanh hơn:** SQLite nhanh hơn JSON files khi có nhiều dữ liệu
- ✅ **An toàn hơn:** ACID transactions, không bị corruption
- ✅ **Dễ query:** Có thể query, filter, sort dễ dàng
- ✅ **Indexing:** Tự động index để tìm kiếm nhanh
- ✅ **Không lag:** Batch processing, không block main thread

---

## 🚀 CÁCH MIGRATE

### Bước 1: Cài đặt dependencies

```bash
npm install
```

### Bước 2: Migrate dữ liệu

```bash
node migrate-to-database.js
```

Script sẽ:
- ✅ Tạo backup JSON files tự động
- ✅ Migrate tất cả modules sang SQLite
- ✅ Verify migration
- ✅ Giữ lại JSON files (backward compatibility)

### Bước 3: Bật database mode

Mở `data-config.js` và thay đổi:

```javascript
USE_DATABASE: true, // Bật database mode
```

### Bước 4: Khởi động lại server

```bash
npm start
```

---

## ⚙️ CẤU HÌNH

### File: `data-config.js`

```javascript
// 🗄️ Cấu hình database
USE_DATABASE: true,              // Bật/tắt database
DATABASE_PATH: './data/qr_management.db',
DATABASE_BATCH_SIZE: 1000,       // Batch size (tăng nếu có nhiều RAM)
```

---

## 🔄 ROLLBACK (Nếu cần)

Nếu muốn quay lại JSON files:

1. **Tắt database mode:**
   ```javascript
   USE_DATABASE: false,
   ```

2. **Khởi động lại server:**
   ```bash
   npm start
   ```

3. **JSON files vẫn còn nguyên** (đã được backup)

---

## 📊 SO SÁNH HIỆU SUẤT

### JSON Files (Hiện tại)
- ✅ Đơn giản
- ✅ Dễ backup (copy file)
- ❌ Chậm khi có >10,000 items
- ❌ Không có transaction
- ❌ Khó query

### SQLite Database (Mới)
- ✅ Nhanh hơn 10-100x với dữ liệu lớn
- ✅ ACID transactions
- ✅ Indexing tự động
- ✅ Query linh hoạt
- ✅ Batch processing (không lag)

---

## 🧪 TEST

### Test 1: Kiểm tra database

```bash
# Mở database (cần sqlite3 CLI)
sqlite3 data/qr_management.db

# Xem tables
.tables

# Đếm items
SELECT COUNT(*) FROM donghang;
```

### Test 2: So sánh tốc độ

1. **Với JSON:** Load 10,000 items → ~2-3 giây
2. **Với Database:** Load 10,000 items → ~0.1-0.2 giây

---

## ⚠️ LƯU Ý

1. **Backup:** Luôn backup trước khi migrate
2. **Dual mode:** Hệ thống hỗ trợ cả JSON và database (có thể switch)
3. **Performance:** Database nhanh hơn nhưng cần compile native module (better-sqlite3)

---

## 🔧 TROUBLESHOOTING

### Lỗi: "Cannot find module 'better-sqlite3'"

**Giải pháp:**
```bash
npm install better-sqlite3
```

**Nếu vẫn lỗi (Windows):**
```bash
npm install --build-from-source better-sqlite3
```

### Lỗi: "Database is locked"

**Giải pháp:**
- Đảm bảo chỉ có 1 process đang truy cập database
- Kiểm tra xem có process khác đang dùng database không

### Database file quá lớn

**Giải pháp:**
- SQLite tự động nén
- Có thể VACUUM để tối ưu:
```sql
VACUUM;
```

---

## 📝 GHI CHÚ

- **Backward compatibility:** Hệ thống vẫn hỗ trợ JSON files
- **Migration:** Có thể migrate bất cứ lúc nào
- **Rollback:** Có thể rollback dễ dàng
- **Performance:** Database nhanh hơn đáng kể với dữ liệu lớn

---

**Cập nhật:** 2025-01-14








