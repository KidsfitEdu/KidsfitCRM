# KidsfitCRM — Backend API

> **Trạng thái:** dự án CRM KIDSFIT/CHECKEE đang được hoàn thiện theo [đặc tả nghiệp vụ hiện hành](../docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md). README mô tả source và cách chạy **hiện tại**, không đồng nghĩa toàn bộ yêu cầu đã được nghiệm thu. Xem [khoảng cách giữa yêu cầu và code](../docs/requirements/CODEBASE_GAP_ANALYSIS.md) và [quyết định sản phẩm](../docs/requirements/DECISION_LOG.md).

Backend cung cấp API cho danh bạ trường học, Sales/CTV tiếp cận, đề xuất và phân bổ trường, xác minh hợp đồng CHECKEE, doanh thu thực thu, hoa hồng, đối soát, CSKH và các nghiệp vụ CRM giáo dục cũ còn được giữ để bảo toàn tương thích. Frontend tương ứng nằm trong [`../frontend/README.md`](../frontend/README.md).

## 1. Công nghệ và yêu cầu môi trường

| Thành phần | Hiện tại |
| --- | --- |
| Framework | ASP.NET Core Web API, **.NET 10** |
| ORM / migrations | Entity Framework Core **10** |
| Database | **MySQL 8.4 LTS**, InnoDB, `utf8mb4` |
| Xác thực | JWT Bearer, phân quyền theo permission và phạm vi tổ chức |
| API | REST/JSON, có xác thực/kiểm tra quyền ở server |
| Test | xUnit/.NET Test, bộ kiểm thử tích hợp MySQL 8.4 |

Cài .NET 10 SDK, MySQL 8.4 và (nếu chạy toàn bộ hệ thống) Node.js theo yêu cầu của Frontend. Lệnh bên dưới dành cho **PowerShell trên Windows** và chạy từ thư mục `backend/`, trừ khi có ghi chú khác.

## 2. Cấu trúc source

```text
backend/
├── src/KidsfitCRM.Api/
│   ├── Program.cs                # Cấu hình ứng dụng, auth, CORS, migrate/seed
│   ├── Domain/                   # Entity và dữ liệu nghiệp vụ
│   ├── Features/                 # API endpoints, actions, kiểm tra quyền/workflow
│   └── Infrastructure/           # DbContext, model configuration, migrations, seeders
├── tests/KidsfitCRM.Api.Tests/   # Unit/integration tests
├── KidsfitCRM.slnx
├── .env.example
└── test-mysql.ps1
```

Backend hiện còn cả nghiệp vụ CRM giáo dục (lead, học viên, lớp, hóa đơn) và nghiệp vụ bán hàng CHECKEE. Không tự xóa entity/migration/ledger chỉ vì màn hình cũ không còn thuộc yêu cầu mới.

## 3. Cài đặt và cấu hình `.env`

```powershell
cd backend
Copy-Item .env.example .env
dotnet --version
dotnet restore KidsfitCRM.slnx
```

Sửa `backend/.env` bằng **giá trị riêng của máy**, không commit file hoặc mật khẩu:

```dotenv
# Chọn đúng MySQL đang sử dụng; ví dụ local script sử dụng port 3307.
ConnectionStrings__MySql=Server=127.0.0.1;Port=3307;Database=kidsfit_crm;User=<mysql_user>;Password=<mysql_password>;Character Set=utf8mb4;

Jwt__Issuer=KidsfitCRM.Api
Jwt__Audience=KidsfitCRM.Web
Jwt__Key=<random_secret_at_least_32_utf8_bytes>
Cors__Origins__0=http://localhost:3000

# Không tự seed khi chạy migrate.
Seed__DemoEnabled=false
Seed__DisposableDatabase=false
# Initial bootstrap is opt-in in Development; configure Seed__AdminPassword, Seed__BoardPassword, Seed__CheckeePassword privately.
```

`ConnectionStrings__MySql`, `Jwt__Issuer`, `Jwt__Audience`, `Jwt__Key` và `Cors__Origins__0` được ánh xạ sang ASP.NET Core configuration. JWT key cần tối thiểu **32 UTF-8 byte**. Biến môi trường của tiến trình/command line được ưu tiên hơn file `.env`. Ứng dụng chỉ tự đọc `.env` khi chạy ở **Development**; không dùng cơ chế này cho Production.

**Cổng MySQL phải khớp môi trường:** `start-local.ps1` của repository mặc định chạy MySQL trên `127.0.0.1:3307`, còn `compose.yaml` công bố cổng máy chủ `3306` (API container kết nối hostname `mysql:3306`). Tránh dùng cùng lúc hai MySQL với connection string không rõ đích.

## 4. Chạy Backend và migration

Sau khi **xác minh connection string trỏ đúng database được phép thay đổi**:

```powershell
# Trong backend/
dotnet build KidsfitCRM.slnx

# Chỉ chạy EF migrations, KHÔNG seed dữ liệu mẫu:
dotnet run --project src/KidsfitCRM.Api -- --migrate

# Chạy API:
dotnet run --project src/KidsfitCRM.Api
```

Địa chỉ mặc định theo `Properties/launchSettings.json`: `http://localhost:8000`. Kiểm tra kết nối database bằng `http://localhost:8000/health`. API bắt đầu tại `/api`; endpoint `/health` nằm ngoài nhóm này.

**Phân biệt:** chạy `--migrate` sẽ cập nhật schema và thoát. Seeder hệ thống `InitialCrmSeeder` chỉ được gọi khi kết hợp `--migrate --seed-initial` trong Development với cờ và mật khẩu hợp lệ; `--seed-demo` hiện bị vô hiệu hóa. Lệnh chạy API thông thường không tự migrate/seed. Không sửa/xóa các migration đã áp dụng để “làm sạch” dữ liệu.

### Chạy toàn hệ thống theo script hoặc Docker (tùy chọn)

Từ thư mục gốc, `.\start-local.ps1` là script hỗ trợ Windows, dùng MySQL local cổng 3307, có thể khởi tạo vùng dữ liệu, tạo database, cấu hình tài khoản MySQL và chạy migration, sau đó bật Backend/Frontend. **Đọc source script trước khi sử dụng**: phiên bản hiện tại có thao tác đổi mật khẩu tài khoản MySQL, gồm cả root. Không chạy trên MySQL dùng chung hoặc chứa dữ liệu thật.

`compose.yaml` dùng Docker với MySQL 8.4 và một volume bền vững; job `api-migrate` chạy migration trước API. File hiện đặt `ASPNETCORE_ENVIRONMENT=Production` và `Seed__DemoEnabled=false` nên **không seed demo**, ngay cả khi sử dụng credential mẫu trong Compose. Thay credential mặc định và cấu hình triển khai phù hợp trước khi public; **không dùng Compose ví dụ như cấu hình production an toàn**.

## 5. Dữ liệu ban đầu và dữ liệu kiểm thử

Production API **không có demo seeder** và không tự tạo tài khoản giả. `--migrate` chỉ cập nhật schema. Với một database Development được xác nhận là disposable, `--migrate --seed-initial` có thể tạo vai trò, tổ chức, tài khoản hệ thống và chính sách bản nháp thông qua `InitialCrmSeeder`. Yêu cầu `Seed__DisposableDatabase=true` và các biến `Seed__AdminPassword`, `Seed__BoardPassword`, `Seed__CheckeePassword` hợp lệ; không ghi mật khẩu vào Git.

Các lớp tạo tình huống giả cũ được chuyển đến `backend/tests/KidsfitCRM.Api.Tests/Fixtures/LegacySeeders/` để chỉ phục vụ unit/integration tests trên MySQL cô lập. Chúng không còn nằm trong API runtime. Không dùng dữ liệu kiểm thử làm seed production.

**Migration ≠ seed ≠ dump/backup.** Không tự xóa khách hàng, trường, hợp đồng, hoa hồng, doanh thu, chứng từ hoặc audit đã có. Trước khi áp migration xóa bảng gói CHECKEE lên database đã có dữ liệu, cần sao lưu và rà soát tham chiếu lịch sử.

## 6. Nghiệp vụ và 7 vai trò mục tiêu

Theo [Functional Specification](../docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md), hệ thống hướng tới **7 vai trò nghiệp vụ**:

| Vai trò mục tiêu | Chức năng chính |
| --- | --- |
| Admin | Tài khoản, import danh bạ trường, duyệt thêm trường, điều chỉnh hạn mức |
| BGĐ KIDSFIT | KPI, chính sách, quá hạn, tranh chấp và ngoại lệ |
| Kế toán | Thu tiền thực tế, công nợ, đối soát và chi hoa hồng theo chính sách đã duyệt |
| Quản lý bán hàng | Quản lý đội nhóm KIDSFIT/đối tác, phân bổ, duyệt đề xuất/gia hạn, rà soát hợp đồng |
| CSKH | Nhận bàn giao và chăm sóc khách hàng được phân công |
| CHECKEE | Xác minh hợp đồng và đối soát theo phạm vi được cấp |
| Sales (NV/CTV) | Tự đăng ký/nhận phân bổ, tư vấn, báo cáo, đề xuất trường, theo dõi thu nhập của mình |

Đây là **mô hình đích**, không phải cam kết database hiện chỉ có đúng 7 `roles`. Source vẫn sử dụng mã tương thích như `BOARD`, `CUSTOMER_CARE`, `CHANNEL_SALES`, `PARTNER_ADMIN` và `PARTNER_COLLABORATOR`. Không xóa lịch sử gán vai trò hoặc bỏ qua phân quyền theo tổ chức.

**Các quy tắc đã chốt (mục tiêu nghiệp vụ):** Sales nhân viên và CTV cùng tối đa **10 trường đang tiếp cận** mặc định (Admin có thể điều chỉnh); bảo vệ lần đầu **5 ngày**, gia hạn **7 ngày/lần tối đa 3 lần** khi quản lý chấp thuận; đề xuất trường mới theo tuyến **Sales → quản lý trực tiếp → Admin**; hợp đồng theo tuyến **Sales → quản lý trực tiếp → CHECKEE xác minh → KIDSFIT ghi nhận bảo vệ 5 năm**. Phải phân biệt trạng thái tổng quan `AVAILABLE / APPROACHING / CONTRACTED` với trạng thái chi tiết của quy trình.

**Chưa được chốt hoặc chưa đồng bộ hoàn toàn vào runtime:** vai trò KIDSFIT cuối cùng có quyền grant bảo vệ 5 năm, SLA chờ duyệt gia hạn, phạm vi bảo vệ trường chính/phân hiệu trong trường hợp pháp lý khác nhau; hoa hồng **30% mới PROVISIONAL**, cách tính và thời điểm phát sinh chưa được duyệt. Không coi tỷ lệ hoa hồng demo cũ 10%/12% là chính sách vận hành thực tế. Xem [Decision Log](../docs/requirements/DECISION_LOG.md) và [Business Rules](../docs/requirements/BUSINESS_RULES.md).

## 7. Một số API hiện có

Tất cả đường dẫn dưới đây nằm dưới prefix `/api`, ngoại trừ `/health`. Phần lớn endpoint nghiệp vụ yêu cầu JWT và permission/organization scope:

| Nhóm | Ví dụ đường dẫn |
| --- | --- |
| Identity | `POST /api/login`, `GET /api/me`, `POST /api/logout` |
| Danh bạ trường | `GET /api/channel-sales/schools`, `GET /api/channel-sales/schools/{id}` |
| Excel import | `POST /api/channel-sales/schools/import/preview`, `POST /api/channel-sales/schools/import/commit` |
| Hạn mức | `GET /api/channel-sales/school-capacities`, `PATCH /api/channel-sales/school-capacities/{id}` |
| Đăng ký tiếp cận | `POST /api/channel-sales/approach-registrations` |
| Đề xuất/phân bổ | `POST /api/channel-sales/school-proposals`, `POST /api/channel-sales/school-invitations` |
| Gia hạn | `POST /api/channel-sales/approaches/{id}/extension-requests` |
| Hợp đồng CHECKEE | `POST /api/channel-sales/school-contracts/{id}/review`, `POST /api/channel-sales/school-contracts/{id}/grant-protection` |
| Báo cáo vận hành | `GET /api/channel-sales/school-operations` |

Endpoint và DTO thực tế nằm trong `Features/ApiEndpoints.cs`, `ChannelSalesEndpoints.cs`, `SchoolEndpoints.cs` và `SchoolOperationsEndpoints.cs`. **Tên gọi endpoint không chứng minh mọi workflow được nghiệm thu**; cần test phân quyền, trạng thái và dữ liệu.

### Cảnh báo đề xuất trường quá hạn (Admin và BGĐ)

Khi Quản lý bán hàng xác nhận chuyển đề xuất sang `PENDING_ADMIN`, Backend tự tính `review_due_at` từ `SchoolWorkflowPolicyVersion.AdminReviewHours` đang hiệu lực; nếu chưa có chính sách, dùng **72 giờ lịch**. Frontend không cho tự đặt hạn xử lý ở bước chuyển và không tự động duyệt.

Ứng dụng API (khi chạy bình thường, không phải `--migrate`) có `SchoolProposalAlertWorker` kiểm tra hồ sơ `PENDING_ADMIN` quá hạn lúc khởi động và mỗi phút. Bảng `school_proposal_alerts` lưu một thông báo theo từng Admin/BGĐ KIDSFIT còn hoạt động và từng thời hạn; khóa unique chống lặp khi nhiều instance chạy. Khi Admin xử lý hồ sơ, thông báo chuyển `RESOLVED`. Không cần Redis, email, cron bên ngoài.

- `GET /api/notifications`: danh sách tối đa 50 cảnh báo đang mở và số chưa đọc của tài khoản hiện tại.
- `POST /api/notifications/{id}/read`: đánh dấu đã đọc, chỉ cho người nhận.
- Migration `ProposalOverdueAlerts` là **additive**, phải chạy `--migrate` trước khi chạy phiên bản API mới. Không xóa hoặc chỉnh migration `InitialCRM` đã áp dụng.
- Công việc quá hạn được tạo khi Backend đang hoạt động; không đảm bảo thông báo tức thời khi dịch vụ ngừng chạy. Không gửi email hoặc Zalo.

## 8. Kiểm thử

```powershell
# Từ backend/
dotnet restore KidsfitCRM.slnx
dotnet build KidsfitCRM.slnx
dotnet test KidsfitCRM.slnx --configuration Release
```

Một số bài test MySQL sẽ **skip** nếu thiếu `KIDSFIT_TEST_MYSQL_ADMIN`. Để chạy tích hợp trên MySQL 8.4 dùng riêng:

```powershell
# CHỈ đặt khi tài khoản này có quyền CREATE/DROP DATABASE trên MySQL TEST độc lập.
$env:KIDSFIT_TEST_MYSQL_ADMIN="<isolated_test_mysql_admin_connection_string>"
.\test-mysql.ps1
```

Fixture tạo và xóa schema thử nghiệm tự sinh; **không cung cấp kết nối production/shared**. Báo cáo PASS/SKIPPED/FAIL theo kết quả chạy thực tế, không coi tài liệu hoặc CI của commit trước là bằng chứng cho commit mới.

## 9. Xử lý lỗi thường gặp

| Triệu chứng | Kiểm tra |
| --- | --- |
| `ConnectionStrings:MySql is required` | `backend/.env` có đúng tên biến? Đang chạy `Development`? Biến môi trường có ghi đè? |
| JWT key không hợp lệ | Có `Jwt__Key` riêng, đủ 32 UTF-8 byte; không dùng placeholder |
| MySQL connection refused | Port 3306/3307, server, database, tài khoản, firewall và connection string |
| `/health` trả 503 | Backend chưa kết nối được MySQL; kiểm tra trạng thái server và quyền tài khoản |
| Seed ban đầu báo thiếu mật khẩu / môi trường | `Seed__AdminPassword`, `Seed__BoardPassword`, `Seed__CheckeePassword`, `Seed__DisposableDatabase`, `ASPNETCORE_ENVIRONMENT` |
| Chưa có tài khoản nền tảng | Kiểm tra cờ `--seed-initial` trong Development và quyền/credential bootstrap |
| Frontend thấy dữ liệu cũ | Kiểm tra [cấu hình Real API Only](../frontend/README.md); migrate/seed không tự loại bỏ dữ liệu cũ |
| `dotnet build` lỗi | Đọc lỗi compiler theo file/dòng; đồng bộ branch trước khi kiểm thử |

## 10. Tài liệu liên quan

- [Mục lục tài liệu](../docs/README.md) · [Workflow](../docs/requirements/BUSINESS_WORKFLOWS.md) · [Roles & permissions](../docs/requirements/ROLES_AND_PERMISSIONS.md)
- [MySQL / migration safety](../docs/implementation/PHASE_1_DB_SAFETY.md) · [Seed scenarios](../docs/testing/CRM_SYNTHETIC_SEED_SCENARIOS.md)
- [Frontend README](../frontend/README.md) · [Source map](../docs/implementation/CURRENT_SOURCE_MAP.md)

> README được cập nhật theo **source PR #25**; tài liệu không thay thế cho build, integration test, seed/restore hoặc phê duyệt chính sách thực tế.
