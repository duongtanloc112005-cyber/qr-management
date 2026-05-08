# ✅ SỬA FILE TỔNG HỢP - TRẠNG THÁI THEO BỘ PHẬN

**Ngày cập nhật:** 2025-01-14

---

## 🎯 THAY ĐỔI

**Trong bảng thống kê các bộ phận, hiển thị trạng thái giống với từng bộ phận**

---

## 📋 TRẠNG THÁI THEO BỘ PHẬN

### 1. **Kho phôi, Hàng sẵn, Hàng tồn**
- **Trạng thái:** `Bàn giao`

### 2. **Sản xuất**
- **Trạng thái:** `In & thêu`

### 3. **Thành phẩm**
- **Trạng thái:** `Hoàn thiện`

### 4. **Đóng hàng**
- **Trạng thái:** Giữ nguyên (Đang xử lý, Đợi file, Thiếu hàng, Xử lý lỗi)

---

## 🔧 CHI TIẾT THAY ĐỔI

### 1. Thêm CSS cho trạng thái mới

**File:** `html/TongHop.html`

```css
.status-Bàngiao {background:#4caf50;color:#ffffff;}
.status-In&thêu {background:#2196f3;color:#ffffff;}
.status-Inthêu {background:#2196f3;color:#ffffff;} /* Fallback */
.status-Hoànthiện {background:#ff9800;color:#ffffff;}
```

### 2. Logic xác định bộ phận hiện tại

**Xác định bộ phận cuối cùng trong dây chuyền mà sản phẩm có mặt:**

- **Dây chuyền HS -> ĐH:**
  - Nếu có ở ĐH → `donghang`
  - Nếu có ở HS → `hangsan` (Bàn giao)

- **Dây chuyền HT -> ĐH:**
  - Nếu có ở ĐH → `donghang`
  - Nếu có ở HT → `hangton` (Bàn giao)

- **Dây chuyền KP -> SX -> TP -> ĐH:**
  - Nếu có ở ĐH → `donghang`
  - Nếu có ở TP → `thanhpham` (Hoàn thiện)
  - Nếu có ở SX → `sanxuat` (In & thêu)
  - Nếu có ở KP → `khophoi` (Bàn giao)

### 3. Tạo options trạng thái động

**Theo bộ phận hiện tại:**

- **Kho phôi, Hàng sẵn, Hàng tồn:**
  ```html
  <option value="Bàn giao">Bàn giao</option>
  ```

- **Sản xuất:**
  ```html
  <option value="In & thêu">In & thêu</option>
  ```

- **Thành phẩm:**
  ```html
  <option value="Hoàn thiện">Hoàn thiện</option>
  ```

- **Đóng hàng hoặc không xác định:**
  ```html
  <option value="Đang xử lý">Đang xử lý</option>
  <option value="Đợi file">Đợi file</option>
  <option value="Thiếu hàng">Thiếu hàng</option>
  <option value="Xử lý lỗi">Xử lý lỗi</option>
  ```

---

## ✅ KẾT QUẢ

### Trước:
- Tất cả sản phẩm hiển thị cùng các option trạng thái: "Đang xử lý", "Đợi file", "Thiếu hàng", "Xử lý lỗi"

### Sau:
- **Kho phôi, Hàng sẵn, Hàng tồn:** Chỉ hiển thị "Bàn giao"
- **Sản xuất:** Chỉ hiển thị "In & thêu"
- **Thành phẩm:** Chỉ hiển thị "Hoàn thiện"
- **Đóng hàng:** Giữ nguyên các option cũ

---

## 📝 LƯU Ý

1. **Xác định bộ phận:** Dựa vào `presenceMaps` để xác định sản phẩm có ở bộ phận nào
2. **Ưu tiên:** Bộ phận cuối cùng trong dây chuyền được ưu tiên
3. **Tương thích:** Đóng hàng và không xác định vẫn giữ nguyên các option cũ

---

## 🔄 LOGIC XỬ LÝ

```javascript
// Xác định bộ phận hiện tại
if (isHS) {
  // HS -> ĐH
  if (có ở ĐH) → donghang
  else if (có ở HS) → hangsan (Bàn giao)
} else if (isHT) {
  // HT -> ĐH
  if (có ở ĐH) → donghang
  else if (có ở HT) → hangton (Bàn giao)
} else {
  // KP -> SX -> TP -> ĐH
  if (có ở ĐH) → donghang
  else if (có ở TP) → thanhpham (Hoàn thiện)
  else if (có ở SX) → sanxuat (In & thêu)
  else if (có ở KP) → khophoi (Bàn giao)
}

// Tạo options theo bộ phận
if (khophoi || hangsan || hangton) {
  → "Bàn giao"
} else if (sanxuat) {
  → "In & thêu"
} else if (thanhpham) {
  → "Hoàn thiện"
} else {
  → Giữ nguyên (Đang xử lý, Đợi file, ...)
}
```

---

**Trạng thái:** ✅ **ĐÃ SỬA XONG**








