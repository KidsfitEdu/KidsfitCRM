# Kidsfit CRM

Mã nguồn: [KidsfitEdu/KidsfitCRM](https://github.com/KidsfitEdu/KidsfitCRM).
Phạm vi demo, quyền truy cập và dữ liệu không đưa lên Git: [hướng dẫn demo](docs/DEMO_DEPLOYMENT.md).

CRM hiện đại cho vận hành giáo dục và đội ngũ bán/triển khai CHECKEE: quản lý lead, học viên, lớp học, học phí, khách hàng doanh nghiệp, quyền bảo vệ, hợp đồng, doanh thu và hoa hồng.

## Mở dự án

Cách nhanh nhất trên máy Windows đã cài .NET 10 SDK, Node.js 22+ và MySQL Server 8.4:

```powershell
.\start-local.ps1
```

Script tự tạo MySQL local riêng tại `.runtime/mysql-data-net10`, chạy migration + dữ liệu mẫu, sau đó mở:

- Giao diện React: [http://localhost:3000](http://localhost:3000)
- ASP.NET Core API: [http://localhost:8000](http://localhost:8000)
- Kiểm tra API: [http://localhost:8000/health](http://localhost:8000/health)

Tài khoản demo:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên | `admin@kidsfit.vn` | `Kidsfit@2026` |
| Tư vấn tuyển sinh | `sales@kidsfit.vn` | `Sales@2026` |
| Đối soát CHECKEE | `checkee@kidsfit.vn` | `Checkee@2026` |
| Đối tác triển khai | `partner@kidsfit.vn` | `Partner@2026` |
| CTV đối tác | `ctv@kidsfit.vn` | `Ctv@2026` |
| Ban giám đốc | `board@kidsfit.vn` | `Board@2026` |
| Kế toán | `accountant@kidsfit.vn` | `Accountant@2026` |
| Quản lý bán hàng | `manager@kidsfit.vn` | `Manager@2026` |
| Chăm sóc khách hàng | `care@kidsfit.vn` | `CustomerCare@2026` |

Các mật khẩu và khóa JWT mẫu chỉ dành cho local/demo. Tài khoản và dữ liệu mẫu chỉ được tạo khi chạy `--migrate --seed-demo` hoặc bật `Seed__DemoEnabled=true`. Docker Compose trong repository là cấu hình demo có bật tùy chọn này.

## Danh bạ trường học theo tài liệu CRM mới

Mở **CHECKEE Sales -> Trường học** để nhập `.xlsx` đúng mẫu đã cung cấp, xem trước
cảnh báo, tìm trường/phân hiệu và quản lý hạn mức CTV. File nguồn không được nhập
tự động: Admin chọn `docs/CRM_Import_Truong_Hoc.xlsx` và xác nhận sau khi rà soát.

Hợp đồng trường học mới phải qua Quản lý -> CHECKEE -> KIDSFIT; bảo vệ 5 năm tính
từ ngày xác minh hợp lệ, không tính từ lúc gửi báo cáo. Hợp đồng lịch sử giữ nguyên.

Chi tiết chức năng đã làm, giả định và backlog: [kế hoạch CRM trường học](docs/SCHOOL_CRM_IMPLEMENTATION.md).

## Chỉ mở giao diện demo

Không cần database hay API:

```powershell
.\start-demo.ps1
```

Giao diện dùng dữ liệu mẫu trong trình duyệt nhưng vẫn hỗ trợ điều hướng, tìm kiếm, pipeline, dark mode, task và xuất CSV.

## Chạy bằng Docker

```powershell
docker compose up --build
```

Compose dùng MySQL 8.4, chạy migration một lần trước khi khởi động API và giữ dữ liệu trong volume `kidsfit_mysql_net10`.

## Chạy thủ công

Terminal API:

```powershell
cd backend
dotnet restore
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
dotnet run --project src/KidsfitCRM.Api
```

Terminal web:

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

## Công nghệ

- Frontend: React 19, TypeScript, Vinext/Vite 8, Tailwind CSS 4, shadcn/ui, Recharts và TanStack Query.
- Backend: ASP.NET Core Web API trên .NET 10, endpoint modules, JWT Bearer và permission-based authorization.
- Data: EF Core 10 với `MySql.EntityFrameworkCore`, migration rõ ràng, MySQL 8.4 LTS/InnoDB/`utf8mb4`.
- Kiến trúc: modular monolith; transaction và row lock cho nhập học/thanh toán; `DECIMAL(19,0)` cho tiền VND; audit log append-only.

## Chức năng hiện có

- Dashboard pipeline, follow-up, lịch học thử, doanh thu và công nợ.
- Tạo lead, chuyển trạng thái hợp lệ, đặt lịch và ghi nhận kết quả học thử.
- Chuyển lead thành phụ huynh + học viên + ghi danh + hóa đơn trong một transaction, an toàn khi gửi lại request.
- Danh sách học viên, lớp, sĩ số, hóa đơn và báo cáo công nợ CSV.
- Thanh toán một phần/toàn phần với số tiền tính phía server, chống thu trùng và chặn thu vượt công nợ.
- RBAC bằng permission code, activity/audit log và hoàn tất task đúng người được giao.
- Workspace CHECKEE Sales với ba trạng thái dẫn xuất: chưa đăng ký, đang tiếp cận và đã ký hợp đồng.
- Đăng ký tiếp cận chống trùng trong 120 giờ bằng transaction, row lock và idempotency key.
- Báo hợp đồng nguyên tử để tạo quyền bảo vệ 5 năm, chi tiết gói CHECKEE, lịch phải thu và hồ sơ đối soát.
- Ghi nhận thực thu, phát sinh hoa hồng theo phiên bản chính sách và giữ ledger theo hướng append-only.
- Phạm vi dữ liệu theo tổ chức; tài khoản CHECKEE chỉ thấy hồ sơ cần đối soát và được che PII/tài chính nội bộ.
- Bốn tab CHECKEE: khách hàng, đối soát, doanh thu/thu nhập và đội ngũ/CTV; chỉ hiển thị chức năng đúng quyền.
- Xác nhận/tranh chấp đối soát có lịch sử; phiếu chi theo nhân sự/tháng qua ba bước lập, duyệt và ghi nhận đã chi.
- Điều chỉnh tăng/giảm hoa hồng bằng bút toán mới có lý do; số thực lãnh lấy từ phiếu đã chi sau khấu trừ, không lấy từ hoa hồng dự kiến.
- Phiên bản chính sách mới không áp hồi tố và chịu hạn mức của tổ chức. Đối tác có thể cấp/khóa CTV trong phạm vi được giao.
- Hồ sơ khách hàng có timeline hoạt động và ghi nhận hỗ trợ sau ký dành cho CSKH.

## Kiểm tra chất lượng

```powershell
dotnet test backend/KidsfitCRM.slnx

cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

Quy ước phát triển nằm trong [`AGENTS.md`](./AGENTS.md) và [skill KidsfitCRM](./.agents/skills/kidsfit-crm-development/SKILL.md).

Kiểm thử tích hợp MySQL dùng database tạm có tiền tố `kidsfit_it_`, áp toàn bộ migration, nạp fixture và tự dọn database sau khi chạy. Đặt biến `KIDSFIT_TEST_MYSQL_ADMIN` trỏ tới MySQL 8.4 local rồi chạy `./backend/test-mysql.ps1`. Khi không có biến này, các integration test được đánh dấu skipped; các bài kiểm tra còn lại vẫn chạy bình thường.

Luồng thử nhanh: đăng ký khách hàng → báo hợp đồng → kế toán ghi nhận thu → CHECKEE xác nhận đối soát → kế toán chọn tháng và lập phiếu chi → duyệt → nhập mã giao dịch thực tế để ghi nhận đã chi. Nhân viên/CTV thấy thu nhập trong phạm vi cá nhân.

Các gói CHECKEE, tỷ lệ 10%/12% và hạn mức 20%/15% hiện là dữ liệu minh họa, cần thay bằng chính sách kinh doanh thực tế trước pilot. Mốc thời gian dùng 120 giờ, 5 năm từ ngày ký, các kỳ thu nhập theo múi giờ Việt Nam.

## Kế hoạch CRM bán hàng CHECKEE

- Nguồn yêu cầu và quy tắc nghiệp vụ: [CHECKEE sales CRM product reference](./.agents/skills/kidsfit-crm-development/references/checkee-sales-crm.md).
- Lộ trình triển khai theo giai đoạn: [CHECKEE CRM implementation plan](./docs/CHECKEE_CRM_IMPLEMENTATION_PLAN.md).
- Module MVP đã được triển khai tại `GET /api/channel-sales/workspace` cùng các named actions đăng ký tiếp cận, cập nhật hoạt động, báo hợp đồng, ghi nhận thực thu và xác nhận/tranh chấp đối soát.
