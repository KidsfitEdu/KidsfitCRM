# Khởi tạo CRM tối giản (Development / disposable MySQL only)

- `--seed-demo` và `Seed:DemoEnabled` không còn tạo dữ liệu giả; chương trình báo lỗi có hướng dẫn.
- `--seed-initial` khởi tạo **7 role**, quyền, 2 tổ chức hệ thống KIDSFIT/CHECKEE và đúng **1 Admin** trên database sạch. Không tạo Sales, CTV, trường, hợp đồng, lịch sử thanh toán hoặc hoa hồng mẫu.
- Cần `ASPNETCORE_ENVIRONMENT=Development`, `Seed__DisposableDatabase=true`, `Seed__AdminPassword` (>= 12 ký tự). Không commit mật khẩu hay ghi vào log.
- Chỉ chạy sau khi đã xác nhận đúng MySQL **dùng thử, có thể xóa**. Bootstrap lặp lại không xóa các tài khoản và dữ liệu đã tạo. Chỉ khi database sạch mới bảo đảm đúng một tài khoản Admin.

## Database mới, chưa có dữ liệu
Trong thư mục `backend/`, cấu hình bí mật qua biến môi trường, sau đó:
```powershell
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-initial
```

## Xóa database thử nghiệm cũ rồi khởi tạo lại
Chỉ trên máy local, kiểm tra chính xác chuỗi kết nối và tên database; script **xóa toàn bộ bảng và dữ liệu hiện có, không sao lưu**:
```powershell
./scripts/reset-demo-database.ps1 -DatabaseName "<tên_db_test>" -ConfirmDatabaseName "<tên_db_test>"
```
Script yêu cầu xác nhận tên database bằng hai tham số trùng nhau và không cho thực hiện trên MySQL ngoài localhost. Không chạy trên database có dữ liệu thật, dữ liệu dùng chung, staging hoặc production.

## Lưu ý
Các lớp seeder kịch bản cũ được giữ như mã lịch sử để không tự ý xóa dependencies/test; **không còn được gọi** từ CLI runtime. Mã nguồn không kết nối hay reset database thay cho người vận hành. Nên kiểm tra quyền Admin và màn hình tạo Quản lý bán hàng trước khi tạo Sales/CTV.
