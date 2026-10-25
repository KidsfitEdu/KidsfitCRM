# Git và bản demo

Repository mã nguồn: https://github.com/KidsfitEdu/KidsfitCRM

Demo công khai trên GitHub Pages (được người dùng chấp thuận ngày 25/10/2026):
https://kidsfitedu.github.io/KidsfitCRM/

Repository CRM vẫn riêng tư. Chỉ artifact giao diện/dữ liệu giả lập được đưa lên
Pages, không công khai toàn bộ mã nguồn hoặc tài liệu thật của CRM.

Bản Site cũ vẫn được giữ riêng tư, không bị xóa hoặc thay đổi audience:
https://kidsfit-crm-demo-20261024.manhtuong0503.chatgpt.site

Site project ID: `appgprj_6adc5c8b3df0819197d26d7ec5aa1ecc`.
Source commit của Site: `3439cebcf2dfd4a8c1eb203ee1af633d180bad9b`.
Khi cập nhật demo, mở lại đúng Site này và giữ nguyên audience; không tạo Site
mới hoặc tự bật truy cập công khai. Bản source Site độc lập với repository CRM.

## Giới hạn demo hosted

- Bản demo chạy giao diện React/Vinext với dữ liệu minh họa, không kết nối API
  local, MySQL, Excel gốc hoặc thông tin khách hàng thật.
- Các thay đổi thử trên giao diện demo chỉ là mô phỏng trong phiên trình duyệt.
  Danh bạ trường ở chế độ demo chỉ đọc, hỗ trợ tìm kiếm và xem phân hiệu/hồ sơ.
- Nhập Excel, phân quyền thực tế, xác minh hợp đồng, doanh thu và chi hoa hồng thật
  cần backend .NET 10/MySQL tại môi trường được cấp quyền. Sites không chạy .NET.
- Site mới giữ quyền truy cập riêng tư. Chưa tự mở công khai hoặc chia sẻ cho nhóm.
- Checkout demo riêng nằm ở `sites/kidsfit-crm-demo` (không đưa vào repository CRM).
  Mã nguồn tương ứng của Site được lưu bởi hệ thống Sites khi phát hành.

## GitHub Pages

Trang công khai không sử dụng lớp đăng nhập ChatGPT; chỉ có màn hình đăng nhập
giả lập. Không coi `noindex` hay tài khoản mẫu là cơ chế bảo mật hoặc giới hạn truy cập.
Không dùng bản Pages để lưu PII, hợp đồng, doanh thu hay mật khẩu thật.

`frontend/vite.pages.config.ts` là target static riêng, không đổi build Vinext/
Sites hoặc API .NET. Nó buộc `NEXT_PUBLIC_DEMO_MODE=true`, API rỗng, không đọc
`.env*`, không copy thư mục public đại trà và không xuất source map. Chỉ import
favicon cần thiết. Font dùng bộ font hệ thống, không cần dịch vụ bên ngoài.

Trong `frontend`:

```text
npm ci
npm run test:demo
npm run lint
npx tsc --noEmit
npm run build:pages
npm run test:pages
npm run preview:pages
```

Output duy nhất để deploy: `frontend/dist-pages/`; không upload workspace,
`dist/server`, `.env*`, backend, MySQL, tài liệu PDF/Excel gốc hay `.runtime`.
Base path cố định `/KidsfitCRM/` theo tên repository. Không có route pathname con:
điều hướng phân hệ là state React nên refresh trang gốc hoạt động trên Pages.

Workflow `.github/workflows/demo-pages.yml` chạy khi main thay đổi frontend hoặc
workflow, và có nút chạy thủ công. Nó kiểm tra demo/build, thử API URL canary giả,
chỉ upload artifact tĩnh rồi deploy với quyền `pages:write`/OIDC trong job deploy.
Không dùng PAT tùy chỉnh hay publish mã nguồn. GitHub Actions được pin commit SHA.
Giữ repository private; không đổi visibility hoặc mua/nâng gói để vượt giới hạn Pages.

Hai kiểm thử artifact xác nhận base path/tệp asset tồn tại, chỉ có tệp static,
không source map, API local, canary hoặc tài khoản đăng nhập local thật trong bundle.
12 kiểm thử demo hiện có tiếp tục kiểm tra 9 tài khoản, session và danh bạ mẫu.

## Đăng nhập giả lập (25/10/2026)

Sau lớp truy cập ChatGPT riêng tư của Site, giao diện có màn hình chọn một trong
chín vai trò và đăng nhập bằng tài khoản công khai `@demo.kidsfit.example`.
Ví dụ `admin@demo.kidsfit.example`, `sales@demo.kidsfit.example`,
`accountant@demo.kidsfit.example`, `checkee@demo.kidsfit.example`.
Mật khẩu chung: `Demo@2026`. Có thể chọn vai trò để tự điền cả email/mật khẩu.

Đây là mô phỏng UX trên trình duyệt, không phải một cơ chế bảo mật. Tài khoản,
mật khẩu và dữ liệu mẫu có thể xem trong mã frontend. Không dùng tài khoản hệ
thống thật, không nhập PII, không gọi API/JWT hay lưu thông tin đăng nhập thật.
Menu và nút thao tác dùng các permission bundle mẫu; chưa mô phỏng đầy đủ phạm vi
tổ chức, đối soát, quản lý đội ngũ, nhập Excel và quy trình chi trả có backend.

Chỉ ID tài khoản demo được giữ ở `sessionStorage` dưới key
`kidsfit_demo_profile_v1`; không lưu mật khẩu/quyền/token. Tải lại trang giữ vai
trò nhưng đặt lại dữ liệu mẫu. Đăng xuất/đổi tài khoản hủy workspace và thay đổi
thử, kể cả modal hoặc cache đang mở. Nếu trình duyệt chặn storage, đăng nhập vẫn
hoạt động trong bộ nhớ và không tự khôi phục khi tải lại.

Frontend chỉ bật màn hình này khi API bị tắt (chẳng hạn
`NEXT_PUBLIC_DEMO_MODE=true`). Bản chạy local có `NEXT_PUBLIC_API_URL` và không
bật demo vẫn dùng đăng nhập API thật; không fallback sang tài khoản giả khi API lỗi.
Lớp truy cập ChatGPT và audience owner-private của Site không thay đổi.

Kiểm tra ngày 25/10/2026: 12/12 demo tests, format check, lint, TypeScript và
production builds đạt. Đã kiểm tra trên trình duyệt: báo sai mật khẩu, chọn vai
trò, khôi phục phiên, menu chỉ xem của Ban giám đốc, ẩn tài chính với CHECKEE và
tạo lead thử -> đăng xuất -> đăng nhập lại không còn lead thử. Không thay đổi
backend/schema; không chạy lại bộ integration MySQL cho thay đổi giao diện này.
Build vẫn có các cảnh báo công cụ về sourcemap và kích thước bundle như bản trước.

## Dữ liệu không đưa lên Git

`.env.local`, `.runtime`, dữ liệu MySQL, node_modules, output build và hai tài liệu
nguồn PDF/Excel được giữ trên máy. Đặc biệt Excel có thông tin liên hệ thật.
Tài liệu tham chiếu đã tổng hợp cho skill và các kế hoạch vẫn được đưa lên Git.

Bộ kiểm thử nhập liệu giả lập luôn có trong repository. Kiểm thử đọc Excel gốc
tự bỏ qua khi clone sang máy không có `docs/CRM_Import_Truong_Hoc.xlsx`; để chạy
kiểm thử đó, đặt bản nguồn được phép sử dụng vào đúng đường dẫn local này.

## Kiểm tra demo và chạy local

Trong `frontend`, chạy `npm run test:demo`, `npm run lint`, `npx tsc --noEmit` và
`npm run build`. Dùng `NEXT_PUBLIC_DEMO_MODE=true` khi muốn build chế độ demo mà
không đọc `NEXT_PUBLIC_API_URL`. Bản local kết nối backend vẫn chạy bằng
`start-local.ps1` như trước; dữ liệu thật không được đồng bộ lên Site.

## Bản vá trước khi phát hành

Đã cập nhật lockfile trong các khoảng phiên bản tương thích, nâng oxfmt lên 0.74.0
và shadcn CLI lên 4.22.1. Giữ nguyên npm, React, Vinext, Tailwind và kiến trúc dự án.
Override `undici` 7.30.1 để tránh bản transitive cũ do công cụ Cloudflare/CLI kéo vào;
không dùng `audit fix --force` để hạ cấp công cụ hosting.

Lần kiểm tra `npm audit` ngày 24/10/2026 sau cập nhật không còn advisory được báo.
Đây là kết quả kiểm tra dependency tại thời điểm chạy, không thay thế kiểm thử hay
cam kết an toàn tuyệt đối. Tham chiếu bản vá:
[undici advisory](https://github.com/advisories/GHSA-xjj6-f33q-929c),
[tinypool advisory](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3),
[Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
