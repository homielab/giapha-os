# 🌐 API Reference

> REST API công khai của Giapha-OS — tích hợp với ứng dụng bên ngoài.

---

## Authentication

Tất cả API endpoints yêu cầu **API Key** trong header:

```http
X-API-Key: giapha_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Lấy API Key: **Dashboard → Cài đặt → REST API → Bật → Copy key**

> API Key được hash SHA-256 trước khi lưu. Nếu mất key, tạo key mới tại Settings.

---

## Base URL

```
https://your-domain.com/api/v1
```

---

## Endpoints

### GET /api/v1/members

Lấy danh sách thành viên với phân trang và lọc.

**Query Parameters:**

| Tham số | Kiểu | Mô tả | Mặc định |
|---------|------|-------|----------|
| `page` | number | Trang (bắt đầu từ 1) | `1` |
| `limit` | number | Số bản ghi mỗi trang (tối đa 100) | `20` |
| `gender` | string | `male` hoặc `female` | — |
| `generation` | number | Số thế hệ | — |
| `search` | string | Tìm theo tên | — |

**Request:**
```http
GET /api/v1/members?page=1&limit=20&search=Nguyễn
X-API-Key: giapha_xxxx
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "full_name": "Nguyễn Văn An",
      "gender": "male",
      "birth_year": 1950,
      "death_year": null,
      "generation": 3,
      "place_of_birth": "Hà Nội",
      "is_deceased": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

### GET /api/v1/members/:id

Lấy chi tiết một thành viên.

**Request:**
```http
GET /api/v1/members/550e8400-e29b-41d4-a716-446655440000
X-API-Key: giapha_xxxx
```

**Response:**
```json
{
  "id": "uuid",
  "full_name": "Nguyễn Văn An",
  "gender": "male",
  "birth_year": 1950,
  "birth_date": "1950-03-15",
  "death_year": null,
  "death_date": null,
  "generation": 3,
  "place_of_birth": "Hà Nội",
  "is_deceased": false,
  "is_in_law": false,
  "birth_order": 1,
  "notes": "Trưởng nam, sinh tại Hà Nội",
  "avatar_url": "https://...",
  "created_at": "2024-01-15T08:00:00Z"
}
```

---

### GET /api/v1/members/:id/relationships

Lấy danh sách quan hệ của một thành viên.

**Request:**
```http
GET /api/v1/members/550e8400-e29b-41d4-a716-446655440000/relationships
X-API-Key: giapha_xxxx
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "related_person": {
        "id": "uuid",
        "full_name": "Nguyễn Thị Bình",
        "gender": "female",
        "birth_year": 1955
      },
      "relationship_type": "marriage",
      "direction": "spouse"
    },
    {
      "id": "uuid",
      "related_person": {
        "id": "uuid",
        "full_name": "Nguyễn Văn Bảo",
        "gender": "male",
        "birth_year": 1978
      },
      "relationship_type": "biological_child",
      "direction": "child"
    }
  ]
}
```

---

### GET /api/v1/stats

Lấy thống kê tổng quan.

**Request:**
```http
GET /api/v1/stats
X-API-Key: giapha_xxxx
```

**Response:**
```json
{
  "total_members": 247,
  "living": 189,
  "deceased": 58,
  "male": 128,
  "female": 119,
  "generations": 6,
  "oldest_generation": 1,
  "newest_generation": 6
}
```

---

### GET /api/v1/docs

Trang tài liệu API dạng HTML (không cần API Key).

```http
GET /api/v1/docs
```

---

## Error Codes

| HTTP Status | Mô tả |
|-------------|-------|
| `200` | Thành công |
| `401` | API Key không hợp lệ hoặc thiếu |
| `403` | API bị tắt trong Settings |
| `404` | Không tìm thấy resource |
| `429` | Quá nhiều request (rate limit) |
| `500` | Lỗi server |

**Ví dụ lỗi:**
```json
{
  "error": "Invalid or missing API key",
  "status": 401
}
```

---

## Ví Dụ Tích Hợp

### JavaScript / Fetch

```javascript
const API_KEY = 'giapha_xxxx';
const BASE_URL = 'https://your-domain.com/api/v1';

async function getMembers(page = 1) {
  const res = await fetch(`${BASE_URL}/members?page=${page}`, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Lấy tất cả thành viên
const { data, pagination } = await getMembers(1);
console.log(`Total: ${pagination.total} members`);
```

### Python

```python
import requests

API_KEY = 'giapha_xxxx'
BASE_URL = 'https://your-domain.com/api/v1'
HEADERS = {'X-API-Key': API_KEY}

def get_stats():
    r = requests.get(f'{BASE_URL}/stats', headers=HEADERS)
    r.raise_for_status()
    return r.json()

stats = get_stats()
print(f"Tổng thành viên: {stats['total_members']}")
```

### cURL

```bash
# Lấy danh sách thành viên
curl -H "X-API-Key: giapha_xxxx" \
  "https://your-domain.com/api/v1/members?limit=10"

# Lấy thống kê
curl -H "X-API-Key: giapha_xxxx" \
  "https://your-domain.com/api/v1/stats"
```

---

## Rate Limiting

Hiện tại không áp dụng rate limit cứng. Khuyến nghị không quá **100 request/phút** để tránh overload server.

---

## Bảo Mật API Key

- Không bao giờ commit API key vào source code
- Dùng biến môi trường: `GIAPHA_API_KEY=giapha_xxxx`
- Xoay key định kỳ trong **Settings → REST API → Tạo key mới**
- Key cũ bị vô hiệu ngay khi tạo key mới
