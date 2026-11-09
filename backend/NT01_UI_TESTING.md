# NT-01 — Kiểm thử trực tiếp trên giao diện CRM (dữ liệu giả)

Tài liệu cho nhánh `feat/nt01-contract-expiry-notifications`. **Không dùng database thật hoặc database chia sẻ.**
Bộ data chỉ chạy khi `Seed:DisposableDatabase=true`, `Seed:ReviewFixtures=true` và `Seed:Nt01Scenarios=true`.
Dữ liệu `NT01-DEMO-*` được tạo một lần và không bị ghi đè khi chạy seed lại.

## 1. Chuẩn bị môi trường Windows / PowerShell

Từ thư mục gốc repo, cấu hình kết nối đến **MySQL riêng có thể xóa** trong `backend/.env` hoặc biến môi trường.
Không dùng địa chỉ DB production. Giữ nguyên cách chạy Frontend/Backend hiện có của dự án.

```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT="Development"
$env:Seed__DisposableDatabase="true"
$env:Seed__ReviewFixtures="true"
$env:Seed__Nt01Scenarios="true"
$env:Seed__AccountingScenarios="false"
$env:Seed__DemoPassword="<mat-khau-demo-tu-dat>"
# ConnectionStrings__MySql phải trỏ tới DB riêng, mới tạo, không chứa dữ liệu thật.
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
```

Nếu seed báo lỗi về dữ liệu đã tồn tại, **không** xóa database đang sử dụng; hãy tạo một DB demo mới và kiểm tra lại connection string. Bộ review chỉ hỗ trợ DB riêng.

Sau đó chạy API bình thường (không kèm `--migrate`):

```powershell
dotnet run --project src/KidsfitCRM.Api
```

Worker NT-01 kiểm tra khi API khởi động rồi định kỳ mỗi giờ. Để tạo test mới, chạy lại migration/seed trên database thử nghiệm khác; không sửa thủ công các hợp đồng đang dùng.

## 2. Danh sách tình huống giả, tự thay đổi theo ngày VN

| Mã hợp đồng | Trường demo | Cảnh báo kỳ vọng |
|---|---|---|
| NT01-DEMO-NT01-01 | Cánh Diều | Hết hạn dịch vụ sau 30 ngày |
| NT01-DEMO-NT01-02 | Tuổi Thơ | Hết hạn dịch vụ sau 15 ngày |
| NT01-DEMO-NT01-03 | Bình Minh | Hết hạn dịch vụ sau 7 ngày |
| NT01-DEMO-NT01-04 | Hồng Nhung | Hết hạn dịch vụ hôm nay |
| NT01-DEMO-NT01-05 | Trăng Non | Hết hạn dịch vụ 30 ngày trước |
| NT01-DEMO-NT01-06 | Vườn Mơ | Có kỳ tái ký đã xác nhận nhưng sẽ gián đoạn |
| NT01-DEMO-NT01-07 | Thảo Nguyên | Quyền bảo vệ Sales còn 30 ngày |
| NT01-DEMO-NT01-08 | Mặt Trời | Quyền bảo vệ Sales còn 7 ngày |
| NT01-DEMO-NT01-09 | Sao Bắc | Quyền bảo vệ Sales đến hạn hôm nay |
| NT01-DEMO-NT01-10 | Hoa Cúc | Đã tái ký liên tục: **không** phát cảnh báo hết hạn kỳ gốc |

Trường `NT01-DEMO-NT01-01/03/05/06/07/09` thuộc Sales, còn `NT01-DEMO-NT01-02/04/08/10` thuộc CTV đối tác.
Tất cả đều là hư cấu; không có số liên hệ thật.

## 3. Kiểm tra giao diện

1. Chạy Frontend theo hướng dẫn của repo, đăng nhập bằng `sales@kidsfit.vn` và mật khẩu demo vừa thiết lập.
2. Mở **chuông thông báo** trên Header. Kiểm tra trường Cánh Diều, Bình Minh, Trăng Non, Vườn Mơ, Thảo Nguyên, Sao Bắc (tùy mốc và quyền); lưu ý Vườn Mơ hiển thị thông báo **tạm gián đoạn**, không ghi ngừng sử dụng hoàn toàn.
3. Nhấn một thông báo: xác nhận được đánh dấu **đã đọc**, tổng số chưa đọc giảm, điều hướng sang màn hình hợp đồng/khách hàng thuộc vai trò.
4. Đăng xuất, đăng nhập `ctv@kidsfit.vn`: thấy nhóm Tuổi Thơ, Hồng Nhung, Mặt Trời; không thấy nhóm Sales nội bộ.
5. Đăng nhập `manager@kidsfit.vn` hoặc `partner@kidsfit.vn`: thấy thông báo của Sales/CTV thuộc đội mình, không thấy đội khác.
6. Đăng nhập `care@kidsfit.vn`: thấy cảnh báo **dịch vụ** của trường được phân công, **không** thấy cảnh báo quyền bảo vệ Sales.
7. Kiểm tra Kế toán, Sales và Quản lý hợp đồng gốc và kỳ tái ký để đối chiếu ngày; lịch thu và hoa hồng không được thay đổi.
8. Khởi động lại API hoặc chạy seed trên đúng DB demo: chuông không có bản ghi thông báo trùng và các hợp đồng đã tạo không bị nhân đôi.

**Lưu ý:** `Seed__Nt01Scenarios=true` chỉ thêm 10 tình huống khi seed trên DB riêng; không biến nút chuông thành nơi chỉnh ngày hợp đồng. Nếu thay đổi ngày nghiệp vụ phải làm qua quy trình có quyền, không cập nhật dữ liệu production bằng SQL.

## 4. Truy vấn kiểm tra read-only (chỉ database demo)

```sql
SELECT c.contract_code, c.service_end_on, c.status, c.verified_at,
       a.kind, a.status AS alert_status, a.due_on, a.milestone_on, a.read_at
FROM contract_expiry_alerts a
JOIN sales_contracts c ON c.id = a.contract_id
WHERE c.contract_code LIKE 'NT01-DEMO-%'
ORDER BY c.contract_code, a.kind;
```

```sql
SELECT c.contract_code, COUNT(*) AS alerts, COUNT(DISTINCT a.deduplication_key) AS unique_alerts
FROM sales_contracts c
JOIN contract_expiry_alerts a ON a.contract_id = c.id
WHERE c.contract_code LIKE 'NT01-DEMO-%'
GROUP BY c.contract_code;
```

Mỗi nhóm phải có `alerts = unique_alerts`. Nếu chuông không có thông báo, kiểm tra tài khoản, quyền, API `/notifications/contract-expiry`, worker và dữ liệu hợp đồng.
