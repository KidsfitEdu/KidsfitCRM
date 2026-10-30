# KidsfitCRM — Frontend

> **Trạng thái:** Frontend CRM KIDSFIT/CHECKEE đang được phát triển và đồng bộ dần với [đặc tả nghiệp vụ](../docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md). Có **hai chế độ chạy riêng biệt**: kết nối API .NET/MySQL thật hoặc bản xem trước tĩnh với dữ liệu giả. Không nhầm dữ liệu giả trên trình duyệt với các bản ghi đã seed vào MySQL.

## 1. Giới thiệu và công nghệ

Giao diện phục vụ công việc danh bạ trường, đăng ký/được phân bổ trường, đề xuất, quản lý tiếp cận, gia hạn, xác minh hợp đồng CHECKEE, doanh thu, hoa hồng, CSKH, báo cáo và kiểm soát theo vai trò.

| Thành phần | Công nghệ trong source |
| --- | --- |
| UI | React **19**, TypeScript **5.9** |
| App routes và phát triển | **Vinext**; `frontend/src/app/` giữ các route |
| Styles | Tailwind CSS **4**, shadcn/ui / Base UI, Lucide |
| Data / forms | TanStack Query, React Hook Form, Zod |
| Demo tĩnh | Vite Pages build và bộ dữ liệu trình bày riêng |
| Backend thật | ASP.NET Core .NET 10 + MySQL 8.4, qua REST/JSON |

**Yêu cầu máy:** Node.js **>=22.13.0**, npm tương ứng; muốn dùng API thật cần chạy Backend theo [hướng dẫn Backend](../backend/README.md). Không chuyển Vinext thành React Router/Next.js theo suy đoán về tên thư mục.

## 2. Cấu trúc dự án

```text
frontend/
├── public/                   # Asset công khai
├── src/
│   ├── app/                  # Route entry, root layout
│   ├── screens/              # Các trang theo nhóm vai trò
│   │   ├── Admin/
│   │   ├── SalesManager/
│   │   ├── SalesStaff/
│   │   ├── Collaborator/
│   │   ├── Board/
│   │   ├── Accounting/
│   │   ├── CustomerCare/
│   │   ├── Checkee/
│   │   └── Auth/
│   ├── components/           # UI và workspace được tái sử dụng
│   ├── config/               # Navigation, view IDs, routes
│   ├── services/             # API client và service theo nghiệp vụ
│   ├── hooks/                # Client hooks
│   ├── providers/            # Context / query providers
│   ├── lib/                  # Tiện ích và dữ liệu demo tĩnh
│   └── types/                # TypeScript contracts
├── tests/                    # Test demo và Pages
├── package.json
├── vite.pages.config.ts
└── .env.example
```

Xem [tài liệu kiến trúc](docs/architecture.md), [design system](../docs/design/FRONTEND_DESIGN_SYSTEM.md) và [current source map](../docs/implementation/CURRENT_SOURCE_MAP.md).

## 3. Cài đặt

Chạy từ thư mục gốc của repository:

```powershell
cd frontend
node --version
npm --version
npm ci
Copy-Item .env.example .env.local
```

`npm ci` sử dụng `package-lock.json`, không tự ý thay package manager. Nếu chưa có `.env.local` và muốn xem demo tĩnh, hãy xem mục 4.

## 4. Phân biệt API thật với bản demo tĩnh

Source `src/components/crm/crm-app.tsx` quyết định nguồn dữ liệu:

- Khi `NEXT_PUBLIC_DEMO_MODE=true`: luôn dùng màn hình demo tĩnh, **không gọi API thật**.
- Khi không bật demo và `NEXT_PUBLIC_API_URL` chứa địa chỉ hợp lệ: dùng đăng nhập JWT và API Backend.
- Khi URL API rỗng: dùng giao diện demo tĩnh, không truy cập MySQL.
- Nếu URL API đã được cấu hình nhưng Backend bị lỗi, **không tự fallback** sang tài khoản demo tĩnh.

### A. Kết nối Backend thật (phù hợp phát triển nghiệp vụ)

File `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_DEMO_MODE=false
```

Tại terminal khác, khởi chạy Backend theo [Backend README](../backend/README.md), đã cấu hình MySQL và chạy migration khi cần. Sau đó:

```powershell
# frontend/
npm run dev
```

Mở `http://localhost:3000`. Đăng nhập bằng tài khoản Backend được cấp, **không sử dụng mật khẩu demo tĩnh**. Màn hình đăng nhập API thật nằm trong `src/screens/Auth/Login/LoginPage.tsx`.

### B. Xem UI tĩnh, không cần Backend/MySQL

File `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_API_URL=
```

```powershell
npm run dev
```

Bản này dùng `src/lib/demo-auth.ts`, `src/lib/school-demo.ts`, `src/lib/crm-data.ts` cùng các fixture liên quan. Nó phục vụ xem giao diện và chuyển giữa các nhóm vai trò, **không phải dữ liệu MySQL**, không tạo JWT Backend và không dùng để xác minh business workflow. Chế độ preview có bộ tài khoản và mật khẩu trình bày **riêng** được định nghĩa trong `demo-auth.ts`; không sao chép các giá trị này sang `Seed__DemoPassword`.

**Quan trọng:** Các biến `NEXT_PUBLIC_*` được đưa vào bundle trình duyệt; **tuyệt đối không đưa mật khẩu, JWT signing key hay connection string MySQL vào đây**. Sửa `.env.local` rồi khởi động lại dev server; khi build cho môi trường khác, đặt đúng giá trị tại thời điểm build.

## 5. Chạy build / Pages preview

Các script được xác nhận từ `package.json`:

| Lệnh (từ `frontend/`) | Mục đích |
| --- | --- |
| `npm run dev` | Vinext development server |
| `npm run dev:reset` | Xóa cache phát triển theo script rồi chạy Vinext |
| `npm run build` | Vinext build |
| `npm run start` | Wrangler dev từ output đã build; không phải lệnh khởi động API |
| `npm run build:pages` | Vite build bản Pages demo |
| `npm run preview:pages` | Vite preview bản Pages demo |
| `npm run lint` | Oxlint |
| `npx tsc --noEmit` | Kiểm tra TypeScript không xuất file |
| `npm run test:demo` | Node test cho các fixture / demo |
| `npm run test:pages` | Node test cho Pages output |
| `npm run format` | Oxfmt; **có thay đổi file** |

Ví dụ kiểm tra source trước khi mở PR:

```powershell
npm ci
npm run lint
npx tsc --noEmit
npm run test:demo
npm run build
npm run build:pages
npm run test:pages
```

Không coi build thành công là đã kiểm thử kết nối MySQL, hành vi API thực tế, UI responsive hay toàn bộ quyền theo tenant. Kết quả CI trên commit cũ cũng không chứng minh commit mới đã PASS.

## 6. Điều hướng và 7 vai trò nghiệp vụ

**Mô hình sản phẩm mục tiêu** gồm Admin, BGĐ KIDSFIT, Kế toán, Quản lý bán hàng, CSKH, CHECKEE và Sales. Nhân viên bán hàng và CTV đều thuộc vai trò **Sales**, khác nhau qua tổ chức/thuộc tính nhân sự khi cần.

Hiện Frontend vẫn có **8 nhóm trang**: `Admin`, `SalesManager`, `SalesStaff`, `Collaborator`, `Board`, `Accounting`, `CustomerCare`, `Checkee`. Hai nhóm `SalesStaff` / `Collaborator` là phần UI tương thích đang chuyển dần về một nghiệp vụ Sales; không có nghĩa hệ thống có thêm vai trò nghiệp vụ thứ tám. Navigation trong `src/config/navigation.ts` và mapping màn hình trong `src/config/` cần được đối chiếu với permission Backend.

| Vai trò mục tiêu | Trọng tâm giao diện |
| --- | --- |
| Admin | Trường học, đề xuất, nhân sự, hạn mức, chính sách và báo cáo |
| BGĐ | Tổng quan KPI, công việc quá hạn, tranh chấp, giám sát |
| Kế toán | Doanh thu, thu/chi, hoàn tiền, báo cáo |
| Quản lý bán hàng | Đề xuất, phân bổ, tiến độ, gia hạn, quản lý Sales |
| CSKH | Nhận bàn giao, hỗ trợ, theo dõi khách hàng |
| CHECKEE | Xác minh hợp đồng, đối soát, lịch sử |
| Sales (nhân viên/CTV) | Tìm/đăng ký trường, nhận phân bổ, hoạt động, đề xuất, gia hạn, thu nhập |

**Quy tắc nghiệp vụ mục tiêu:** Sales có hạn mức mặc định **10 trường đang tiếp cận**; lần đầu **5 ngày** và gia hạn **7 ngày/lần tối đa 3 lần** có duyệt; đề xuất Sales → quản lý → Admin; hợp đồng Sales → quản lý → CHECKEE → KIDSFIT ghi nhận bảo vệ 5 năm. **Không khẳng định mọi màn hình/API đã hoàn thiện đầy đủ**. Xem [roles](../docs/requirements/ROLES_AND_PERMISSIONS.md), [workflows](../docs/requirements/BUSINESS_WORKFLOWS.md), [gap analysis](../docs/requirements/CODEBASE_GAP_ANALYSIS.md).

**Chính sách chưa chốt:** vai trò có quyền ghi nhận bảo vệ 5 năm phía KIDSFIT, chi tiết SLA gia hạn, tính chất bảo vệ trường chính/phân hiệu trong trường hợp pháp lý khác nhau, tỷ lệ hoa hồng 30% còn **PROVISIONAL** và cơ sở tính/duyệt chi chưa được phê duyệt. Không tự kích hoạt qua giao diện.

## 7. Đăng nhập, trạng thái và dữ liệu

- **API thật:** `POST /api/login` và `GET /api/me`; Backend cấp JWT và quyền thực tế, server luôn kiểm tra scope. Workspace hiện giữ `kidsfit_token` trong `sessionStorage`. Đây là trạng thái code hiện hành, không phải khuyến nghị dùng browser token cho sản phẩm production trước khi security review.
- **Demo tĩnh:** `DemoAccess` dùng danh sách fixture công khai và một session ID trình bày. Không có JWT Backend.
- Các trang API-connected đang được tách dần khỏi fixture CRM giáo dục cũ. Nếu còn thấy dữ liệu mẫu: kiểm tra URL, biến demo mode, session trình duyệt, endpoint và dữ liệu thực tế được seed; seed không tự dọn dữ liệu cũ.
- Không sử dụng quyền hiển thị/hide button thay thế server authorization; mọi mutation phải được phân quyền phía API.

## 8. Troubleshooting

| Vấn đề | Cách kiểm tra |
| --- | --- |
| Vẫn thấy trường hoặc học viên demo | `NEXT_PUBLIC_DEMO_MODE` có đang `true`? URL API có rỗng không? Dev server đã được khởi động lại? |
| API thật không kết nối | Backend chạy ở port 8000? `http://localhost:8000/health` OK? `NEXT_PUBLIC_API_URL` đã chứa `/api`? |
| CORS | `Cors__Origins__0` của Backend phải bao gồm origin Frontend, ví dụ `http://localhost:3000` |
| Đăng nhập thất bại | Có đang ở đúng chế độ? Password backend được seed/cấp riêng, không phải password preview |
| Một vai trò không có dữ liệu | Kiểm tra `GET /api/me`, permission, membership, organization scope và seed, thay vì tự giả dữ liệu |
| Build/TypeScript/lint lỗi | Chạy `npm ci`, `npm run lint`, `npx tsc --noEmit`; dùng Node >=22.13.0 và đúng branch |
| Browser có dữ liệu cũ sau chuyển môi trường | Đảm bảo không dùng token phiên cũ và kiểm tra tab Network để biết API nào đang được gọi |
| Pages khác chạy API | Pages build là **demo tĩnh**, không phải triển khai Backend .NET/MySQL |

## 9. Tài liệu liên quan

- [Backend setup, migration và seed](../backend/README.md)
- [Kiến trúc Frontend](docs/architecture.md)
- [Mục lục tài liệu dự án](../docs/README.md)
- [Functional Specification](../docs/requirements/CRM_FUNCTIONAL_SPECIFICATION.md)
- [Decision Log](../docs/requirements/DECISION_LOG.md)
- [Design System](../docs/design/FRONTEND_DESIGN_SYSTEM.md)
- [Tình huống seed và các phần chưa hoàn tất](../docs/testing/CRM_SYNTHETIC_SEED_SCENARIOS.md)

> Chỉ chỉnh README trong phạm vi cập nhật tài liệu; thao tác xây dựng/seed database và xóa dữ liệu là quy trình riêng phải được xác minh an toàn.
