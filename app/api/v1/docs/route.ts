import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Giapha-OS — API Documentation</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; background: #fafaf9; color: #1c1917; }
    .container { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; font-weight: 600; margin-top: 2.5rem; border-bottom: 1px solid #e7e5e4; padding-bottom: 0.5rem; }
    h3 { font-size: 1rem; font-weight: 600; margin-top: 1.5rem; color: #44403c; }
    p, li { line-height: 1.7; color: #44403c; }
    code { background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 4px; padding: 0.1em 0.4em; font-size: 0.875em; font-family: monospace; }
    pre { background: #1c1917; color: #fafaf9; border-radius: 8px; padding: 1rem 1.25rem; overflow-x: auto; }
    pre code { background: none; border: none; padding: 0; font-size: 0.875rem; color: inherit; }
    .badge { display: inline-block; padding: 0.15em 0.6em; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .get { background: #dcfce7; color: #166534; }
    .endpoint { display: flex; align-items: center; gap: 0.75rem; margin-top: 1.5rem; }
    .path { font-family: monospace; font-size: 0.95rem; font-weight: 500; }
    .desc { color: #78716c; font-size: 0.875rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-top: 0.75rem; }
    th { text-align: left; background: #f5f5f4; padding: 0.5rem 0.75rem; border: 1px solid #e7e5e4; font-weight: 600; }
    td { padding: 0.5rem 0.75rem; border: 1px solid #e7e5e4; vertical-align: top; }
    .tag { background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; border-radius: 4px; padding: 0.1em 0.4em; font-size: 0.75rem; font-family: monospace; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.875rem; color: #92400e; margin-top: 1rem; }
  </style>
</head>
<body>
<div class="container">
  <h1>📖 Giapha-OS REST API</h1>
  <p>Public REST API cho phép tích hợp bên ngoài đọc dữ liệu gia phả. Yêu cầu API key.</p>

  <h2>Xác thực (Authentication)</h2>
  <p>Thêm header sau vào mọi request:</p>
  <pre><code>Authorization: Bearer &lt;your-api-key&gt;</code></pre>
  <p>API key được quản lý tại <a href="/dashboard/settings">Dashboard → Cài đặt → API Key</a>.</p>

  <h2>Base URL</h2>
  <pre><code>${baseUrl}/api/v1</code></pre>

  <h2>Định dạng phản hồi</h2>
  <p>Mọi response trả về <code>Content-Type: application/json</code>.</p>
  <h3>Thành công</h3>
  <pre><code>{ "data": [...], "total": 120, "page": 1, "limit": 50 }</code></pre>
  <h3>Lỗi</h3>
  <pre><code>{ "error": "Invalid API key", "code": "UNAUTHORIZED" }</code></pre>

  <h2>Endpoints</h2>

  <!-- GET /members -->
  <div class="endpoint">
    <span class="badge get">GET</span>
    <span class="path">/api/v1/members</span>
    <span class="desc">Danh sách thành viên gia đình</span>
  </div>
  <h3>Query params</h3>
  <table>
    <tr><th>Param</th><th>Kiểu</th><th>Mô tả</th><th>Mặc định</th></tr>
    <tr><td><code>page</code></td><td>number</td><td>Số trang</td><td>1</td></tr>
    <tr><td><code>limit</code></td><td>number</td><td>Số kết quả mỗi trang (tối đa 200)</td><td>50</td></tr>
    <tr><td><code>generation</code></td><td>number</td><td>Lọc theo thế hệ</td><td>—</td></tr>
    <tr><td><code>gender</code></td><td>string</td><td><span class="tag">male</span> <span class="tag">female</span> <span class="tag">other</span></td><td>—</td></tr>
    <tr><td><code>search</code></td><td>string</td><td>Tìm theo tên (không phân biệt hoa thường)</td><td>—</td></tr>
  </table>
  <h3>Ví dụ response</h3>
  <pre><code>{
  "data": [
    {
      "id": "uuid",
      "full_name": "Nguyễn Văn A",
      "birth_year": 1950,
      "death_year": null,
      "gender": "male",
      "generation": 3,
      "is_deceased": false,
      "is_in_law": false,
      "avatar_url": null
    }
  ],
  "total": 120,
  "page": 1,
  "limit": 50
}</code></pre>

  <!-- GET /members/:id -->
  <div class="endpoint">
    <span class="badge get">GET</span>
    <span class="path">/api/v1/members/:id</span>
    <span class="desc">Chi tiết một thành viên (bao gồm quan hệ)</span>
  </div>
  <h3>Ví dụ response</h3>
  <pre><code>{
  "id": "uuid",
  "full_name": "Nguyễn Văn A",
  "birth_year": 1950,
  "birth_month": 5,
  "birth_day": 12,
  "gender": "male",
  "generation": 3,
  "is_deceased": false,
  "is_in_law": false,
  "relationships": [
    {
      "id": "rel-uuid",
      "type": "biological_child",
      "direction": "incoming",
      "related_person": { "id": "parent-uuid", "full_name": "Nguyễn Văn B", "gender": "male", "generation": 2 },
      "note": null
    }
  ]
}</code></pre>

  <!-- GET /members/:id/relationships -->
  <div class="endpoint">
    <span class="badge get">GET</span>
    <span class="path">/api/v1/members/:id/relationships</span>
    <span class="desc">Tất cả quan hệ của một thành viên</span>
  </div>
  <h3>Ví dụ response</h3>
  <pre><code>{
  "member_id": "uuid",
  "data": [
    {
      "id": "rel-uuid",
      "type": "marriage",
      "direction": "outgoing",
      "related_person": { "id": "spouse-uuid", "full_name": "Trần Thị B", "gender": "female", "generation": 3 },
      "note": null
    }
  ]
}</code></pre>

  <!-- GET /stats -->
  <div class="endpoint">
    <span class="badge get">GET</span>
    <span class="path">/api/v1/stats</span>
    <span class="desc">Thống kê tổng quan gia phả</span>
  </div>
  <h3>Ví dụ response</h3>
  <pre><code>{
  "total": 120,
  "by_gender": { "male": 65, "female": 55 },
  "by_generation": { "1": 2, "2": 8, "3": 35, "4": 75 },
  "alive": 98,
  "deceased": 22
}</code></pre>

  <h2>Relationship Types</h2>
  <table>
    <tr><th>Type</th><th>Mô tả</th></tr>
    <tr><td><code>marriage</code></td><td>Hôn nhân</td></tr>
    <tr><td><code>biological_child</code></td><td>Con ruột (person_a là cha/mẹ, person_b là con)</td></tr>
    <tr><td><code>adopted_child</code></td><td>Con nuôi</td></tr>
    <tr><td><code>step_parent</code></td><td>Cha/mẹ kế</td></tr>
    <tr><td><code>sibling</code></td><td>Anh chị em ruột</td></tr>
    <tr><td><code>half_sibling</code></td><td>Anh chị em cùng cha/mẹ khác mẹ/cha</td></tr>
    <tr><td><code>godparent</code></td><td>Cha/mẹ đỡ đầu</td></tr>
  </table>

  <h2>HTTP Status Codes</h2>
  <table>
    <tr><th>Code</th><th>Ý nghĩa</th></tr>
    <tr><td><code>200</code></td><td>Thành công</td></tr>
    <tr><td><code>401</code></td><td>API key không hợp lệ hoặc API bị tắt</td></tr>
    <tr><td><code>404</code></td><td>Không tìm thấy tài nguyên</td></tr>
    <tr><td><code>500</code></td><td>Lỗi server</td></tr>
  </table>

  <div class="note">
    ℹ️ Thông tin nhạy cảm (số điện thoại, địa chỉ, nghề nghiệp) không được trả về qua API này.
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
