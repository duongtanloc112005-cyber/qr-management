# 📚 API DOCUMENTATION

**Base URL:** `http://localhost:3000/api`

**Version:** 1.0.0

---

## 🔐 Authentication

### POST /api/auth/login

Đăng nhập vào hệ thống.

**Request:**
```json
{
  "username": "admin",
  "password": "0123",
  "moduleName": "tonghop"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "username": "admin",
    "role": "admin",
    "display": "Quản lý"
  }
}
```

**Response (401):**
```json
{
  "success": false,
  "error": "Sai tên đăng nhập hoặc mật khẩu"
}
```

**Rate Limit:** 5 requests / 15 phút

---

### POST /api/auth/check

Kiểm tra authentication.

**Request:** Giống `/api/auth/login`

**Response:** Giống `/api/auth/login`

---

## 📦 Modules API

### GET /api/modules/:module

Lấy danh sách sản phẩm với pagination và filtering.

**Parameters:**
- `module` (path): Tên module (`donghang`, `khophoi`, `sanxuat`, `thanhpham`)

**Query Parameters:**
- `page` (optional): Số trang (default: 1)
- `limit` (optional): Số items mỗi trang (default: 100, max: 1000)
- `sortBy` (optional): Sắp xếp theo (`maGoc`, `trangThai`, `ngayTao`) (default: `maGoc`)
- `sortOrder` (optional): Thứ tự (`asc`, `desc`) (default: `desc`)
- `search` (optional): Tìm kiếm (tìm trong `maGoc`, `ghiChu`, `dotHang`)
- `trangThai` (optional): Lọc theo trạng thái

**Example:**
```
GET /api/modules/donghang?page=1&limit=50&sortBy=ngayTao&sortOrder=desc&search=ABC&trangThai=Hoàn thành
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "maGoc": "ABC123",
      "trangThai": "Hoàn thành",
      "ghiChu": "Ghi chú",
      "ngayTao": "2025-01-14T10:00:00.000Z",
      "lichSu": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Caching:** 5 giây

---

### GET /api/modules/:module/:maGoc

Lấy thông tin một sản phẩm cụ thể.

**Parameters:**
- `module` (path): Tên module
- `maGoc` (path): Mã gốc của sản phẩm

**Example:**
```
GET /api/modules/donghang/ABC123
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "maGoc": "ABC123",
    "trangThai": "Hoàn thành",
    ...
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Không tìm thấy sản phẩm"
}
```

**Caching:** 5 giây

---

### POST /api/modules/:module

Tạo mới sản phẩm.

**Parameters:**
- `module` (path): Tên module

**Request Body:**
```json
{
  "maGoc": "ABC123",
  "trangThai": "Đang xử lý",
  "ghiChu": "Ghi chú",
  "dotHang": "Đợt 1",
  "loaiHang": "Loại A",
  "loaiSX": "Sản xuất 1"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "maGoc": "ABC123",
    "trangThai": "Đang xử lý",
    "ngayTao": "2025-01-14T10:00:00.000Z",
    ...
  },
  "message": "Tạo sản phẩm thành công"
}
```

**Response (409):**
```json
{
  "success": false,
  "error": "Sản phẩm với mã này đã tồn tại"
}
```

---

### PUT /api/modules/:module/:maGoc

Cập nhật sản phẩm.

**Parameters:**
- `module` (path): Tên module
- `maGoc` (path): Mã gốc của sản phẩm

**Request Body:** Giống POST (tất cả fields đều optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "maGoc": "ABC123",
    "trangThai": "Hoàn thành",
    ...
  },
  "message": "Cập nhật thành công"
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Không tìm thấy sản phẩm"
}
```

---

### DELETE /api/modules/:module/:maGoc

Xóa sản phẩm.

**Parameters:**
- `module` (path): Tên module
- `maGoc` (path): Mã gốc của sản phẩm

**Response (200):**
```json
{
  "success": true,
  "message": "Xóa thành công",
  "data": {
    "maGoc": "ABC123",
    ...
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Không tìm thấy sản phẩm"
}
```

---

### GET /api/modules/:module/stats

Lấy thống kê của module.

**Parameters:**
- `module` (path): Tên module

**Response (200):**
```json
{
  "success": true,
  "module": "donghang",
  "data": {
    "total": 150,
    "byStatus": {
      "Hoàn thành": 100,
      "Đang xử lý": 30,
      "Thiếu hàng": 20
    },
    "byDate": {
      "2025-01-14": 50,
      "2025-01-13": 100
    }
  }
}
```

**Caching:** 5 giây

---

## 🏥 Health Check

### GET /api/modules/health

Kiểm tra trạng thái hệ thống.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2025-01-14T10:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "rss": 50000000,
    "heapTotal": 30000000,
    "heapUsed": 20000000
  },
  "modules": ["donghang", "khophoi", "sanxuat", "thanhpham"],
  "database": "disabled"
}
```

---

## ⚠️ Error Responses

Tất cả endpoints trả về error với format:

```json
{
  "success": false,
  "error": "Mô tả lỗi"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (duplicate)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

---

## 🛡️ Rate Limiting

- **API endpoints:** 100 requests / 15 phút
- **Login endpoint:** 5 requests / 15 phút

Khi vượt rate limit, response:
```json
{
  "error": "Quá nhiều yêu cầu, vui lòng thử lại sau."
}
```
HTTP Status: `429`

---

## 📝 Validation Rules

### Product Schema:
- `maGoc`: Required, string, max 200 chars, alphanumeric + spaces/dashes/underscores
- `trangThai`: Required, enum: `['Đang xử lý', 'Đợi file', 'Thiếu hàng', 'Xử lý lỗi', 'Hoàn thành', 'Nhận hàng']`
- `ghiChu`: Optional, string, max 1000 chars
- `dotHang`: Optional, string, max 50 chars
- `loaiHang`: Optional, string, max 100 chars
- `loaiSX`: Optional, string, max 50 chars

---

## 🚀 Performance

- **Caching:** 5 giây cho GET requests
- **Pagination:** Mặc định 100 items/page, max 1000
- **Async operations:** Save/update chạy background, không block
- **Batch processing:** Database operations batch 1000 items

---

## 📖 Examples

### cURL Examples

```bash
# Get all products
curl http://localhost:3000/api/modules/donghang?page=1&limit=50

# Get one product
curl http://localhost:3000/api/modules/donghang/ABC123

# Create product
curl -X POST http://localhost:3000/api/modules/donghang \
  -H "Content-Type: application/json" \
  -d '{"maGoc":"ABC123","trangThai":"Đang xử lý"}'

# Update product
curl -X PUT http://localhost:3000/api/modules/donghang/ABC123 \
  -H "Content-Type: application/json" \
  -d '{"trangThai":"Hoàn thành"}'

# Delete product
curl -X DELETE http://localhost:3000/api/modules/donghang/ABC123

# Get stats
curl http://localhost:3000/api/modules/donghang/stats

# Health check
curl http://localhost:3000/api/modules/health
```

### JavaScript Examples

```javascript
// Fetch all products
const response = await fetch('http://localhost:3000/api/modules/donghang?page=1&limit=50');
const data = await response.json();

// Create product
const response = await fetch('http://localhost:3000/api/modules/donghang', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    maGoc: 'ABC123',
    trangThai: 'Đang xử lý'
  })
});
```

---

**Cập nhật:** 2025-01-14








