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
# Chỉ khai báo riêng tư khi seed database DEMO đã xác minh an toàn:
# Seed__DemoPassword=<demo_password>
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

**Phân biệt:** chạy `--migrate` sẽ cập nhật schema và thoát. Seeder chỉ được gọi trong nhánh `--migrate` khi có thêm `--seed-demo` hoặc cấu hình `Seed__DemoEnabled=true`. Lệnh chạy API thông thường không tự migrate/seed. Không sửa/xóa các migration đã áp dụng để “làm sạch” dữ liệu.

### Chạy toàn hệ thống theo script hoặc Docker (tùy chọn)

Từ thư mục gốc, `.\start-local.ps1` là script hỗ trợ Windows, dùng MySQL local cổng 3307, có thể khởi tạo vùng dữ liệu, tạo database, cấu hình tài khoản MySQL và chạy migration, sau đó bật Backend/Frontend. **Đọc source script trước khi sử dụng**: phiên bản hiện tại có thao tác đổi mật khẩu tài khoản MySQL, gồm cả root. Không chạy trên MySQL dùng chung hoặc chứa dữ liệu thật.

`compose.yaml` dùng Docker với MySQL 8.4 và một volume bền vững; job `api-migrate` chạy migration trước API. File hiện đặt `ASPNETCORE_ENVIRONMENT=Production` và `Seed__DemoEnabled=false` nên **không seed demo**, ngay cả khi sử dụng credential mẫu trong Compose. Thay credential mặc định và cấu hình triển khai phù hợp trước khi public; **không dùng Compose ví dụ như cấu hình production an toàn**.

## 5. Seed dữ liệu mẫu, mật khẩu và dữ liệu cũ

**Quyết định hiện tại:** giữ database đang sử dụng, bổ sung tình huống CRM còn thiếu. Điều này **không cho phép** reset/xóa hàng loạt dữ liệu cũ; trước khi thao tác cần xác minh quyền sở hữu database, sao lưu và bản chất từng bản ghi. Nếu database có dữ liệu thật/không rõ nguồn gốc, **không bật demo seed trên database đó**.

Seeder Backend: `Infrastructure/DatabaseSeeder.cs` và `CrmScenarioSeeder.cs`. Seed có tài khoản tương thích legacy và một số tình huống đề xuất, gia hạn, CSKH; **chưa bao phủ mọi tình huống**. Seed lại thường chỉ bổ sung dữ liệu còn thiếu, **không xóa bản ghi cũ**. Dữ liệu mẫu CRM giáo dục vẫn có thể tồn tại trên database cũ.

Chỉ trên **database Development/demo dùng riêng đã kiểm chứng disposable**, cung cấp bí mật trong `.env` hoặc secret store:

```dotenv
Seed__DemoEnabled=false
Seed__DisposableDatabase=true
Seed__DemoPassword=<private_password>
```

Sau đó có thể chạy tường minh:

```powershell
dotnet run --project src/KidsfitCRM.Api -- --migrate --seed-demo
```

- Cùng một `Seed__DemoPassword` dùng cho các tài khoản Backend demo được định danh; mỗi account được hash **riêng**. Không lưu mật khẩu vào Git hoặc SQL dump.
- Seeder từ chối thiếu password, thiếu cờ `Seed__DisposableDatabase=true` hoặc chạy trong `Production`. Cờ disposable **không tự chứng minh database an toàn**.
- Mật khẩu database, JWT key và mật khẩu demo phải độc lập. Demo tĩnh Frontend có cơ chế đăng nhập riêng, không dùng JWT Backend.
- **Migration ≠ seed ≠ dump/backup**. Không commit dump có PII, hash mật khẩu, hợp đồng hay dữ liệu tài chính.

Xem [danh mục tình huống seed và các phần chưa có](../docs/testing/CRM_SYNTHETIC_SEED_SCENARIOS.md). Không dùng script xóa `leads`, `students`, `invoices`, `sales_contracts`, `commission_ledger` hoặc audit nếu chưa có danh mục bản ghi demo đã kiểm chứng và kế hoạch khôi phục.

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
| Seed báo thiếu mật khẩu / môi trường | `Seed__DemoPassword`, `Seed__DisposableDatabase`, `ASPNETCORE_ENVIRONMENT` |
| Không xuất hiện tình huống demo mới | Kiểm tra phiên bản branch, seeder đang được gọi, dữ liệu đã tồn tại, scope tài khoản và API/UI |
| Frontend thấy dữ liệu cũ | Kiểm tra [chế độ API thật và demo tĩnh](../frontend/README.md); migrate/seed không tự loại bỏ dữ liệu cũ |
| `dotnet build` lỗi | Đọc lỗi compiler theo file/dòng; đồng bộ branch trước khi kiểm thử |

## 10. Tài liệu liên quan

- [Mục lục tài liệu](../docs/README.md) · [Workflow](../docs/requirements/BUSINESS_WORKFLOWS.md) · [Roles & permissions](../docs/requirements/ROLES_AND_PERMISSIONS.md)
- [MySQL / migration safety](../docs/implementation/PHASE_1_DB_SAFETY.md) · [Seed scenarios](../docs/testing/CRM_SYNTHETIC_SEED_SCENARIOS.md)
- [Frontend README](../frontend/README.md) · [Source map](../docs/implementation/CURRENT_SOURCE_MAP.md)

> README được cập nhật theo **source PR #25**; tài liệu không thay thế cho build, integration test, seed/restore hoặc phê duyệt chính sách thực tế.
