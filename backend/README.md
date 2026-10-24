# KidsfitCRM API

ASP.NET Core Web API chạy trên .NET 10, EF Core 10 và MySQL 8.4.

```powershell
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
dotnet run --project src/KidsfitCRM.Api
```

API mặc định: `http://localhost:8000`. Cấu hình bằng biến môi trường theo `.env.example`; không dùng khóa JWT mẫu cho môi trường thật.

Bounded context `ChannelSales` nằm cạnh CRM giáo dục hiện có và cung cấp customer directory, bảo vệ tiếp cận 5 ngày, hợp đồng/bảo vệ 5 năm, doanh thu thực thu, commission ledger và đối soát CHECKEE. Chạy migration trước khi khởi động API để tạo các bảng MySQL tương ứng.

`--migrate` chỉ nâng cấp schema. `--seed-demo` là lựa chọn tường minh cho local/demo; không bật trên database vận hành thật.

API bổ sung: `/api/channel-sales/finance`, `/reconciliation-cases`, `/management`, `/customers/{id}`, `/customers/{id}/support-activities`, `/payouts`, `/payouts/{id}/approve`, `/payouts/{id}/complete`, `/commission-policies`, `/commissions/{id}/adjustments`, `/team`, `/team/{id}/status`.

`test-mysql.ps1` chạy kiểm thử tích hợp trên MySQL 8.4 với database tạm riêng. Test bao phủ migration/seeding lặp lại, tranh quyền cùng khách hàng, lock timeout/retry, hết hạn không phụ thuộc worker, chống gửi trùng, scope, thu trùng/thu vượt, rollback, đối soát, chi trả và bút toán điều chỉnh.
