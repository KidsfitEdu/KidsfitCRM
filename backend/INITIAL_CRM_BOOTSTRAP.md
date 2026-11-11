# Khởi tạo CRM tối giản (Development / disposable MySQL only)

- `--seed-demo` và `Seed:DemoEnabled` không còn tạo dữ liệu giả; chương trình báo lỗi có hướng dẫn.
- `--seed-initial` khởi tạo **7 role**, quyền, 2 tổ chức hệ thống KIDSFIT/CHECKEE và **3 tài khoản nền tảng** (Admin, BGĐ KIDSFIT, CHECKEE) trên database sạch. Không tạo Sales, CTV, trường, hợp đồng, lịch sử thanh toán hoặc hoa hồng mẫu.
- Cần `ASPNETCORE_ENVIRONMENT=Development`, `Seed__DisposableDatabase=true` cùng ba mật khẩu cấu hình riêng `Seed__AdminPassword`, `Seed__BoardPassword`, `Seed__CheckeePassword` (mỗi mật khẩu >= 12 ký tự khi tài khoản tương ứng chưa tồn tại). Không commit mật khẩu hay ghi vào log.
- Chỉ chạy sau khi đã xác nhận đúng MySQL **dùng thử, có thể xóa**. Bootstrap lặp lại không xóa các tài khoản và dữ liệu đã tạo. Chỉ khi database sạch mới bảo đảm đúng ba tài khoản nền tảng.

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

## Tài khoản và chính sách khởi tạo

| Email | Role | Tổ chức | Biến môi trường mật khẩu |
| --- | --- | --- | --- |
| `admin@kidsfit.vn` | `ADMIN` | `KIDSFIT` | `Seed__AdminPassword` |
| `board@kidsfit.vn` | `DIRECTOR` | `KIDSFIT` | `Seed__BoardPassword` |
| `checkee@kidsfit.vn` | `CHECKEE` | `CHECKEE` | `Seed__CheckeePassword` |

Chọn mật khẩu riêng, không commit, không chia sẻ ảnh chụp có mật khẩu. Bootstrap không thay đổi mật khẩu, trạng thái hoặc quyền khác của tài khoản đã có. Khi thiếu mật khẩu cần thiết cho tài khoản mới, lệnh báo lỗi và transaction rollback, không reset database.

Nếu tổ chức KIDSFIT chưa có phiên bản chính sách vận hành nào, bootstrap sẽ thêm bản nháp V1 (`DRAFT`): thời hạn Quản lý 24 giờ, Admin 48 giờ, phản hồi phân bổ 24 giờ, gia hạn 7 ngày/lần, tối đa 3 lần và 21 ngày. Không tự kích hoạt, không ghi đè chính sách đã có; BGĐ phải duyệt trước khi có hiệu lực. Khi chưa có chính sách ACTIVE, SLA hiện hành vẫn áp dụng mặc định của backend (ví dụ đề xuất chờ Admin 72 giờ).

Có thể chạy lại `--seed-initial` trên database thử nghiệm đã khởi tạo để bổ sung các tài khoản và chính sách còn thiếu. Không chạy reset script nếu muốn giữ dữ liệu đang kiểm thử.
