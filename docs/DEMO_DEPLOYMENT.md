# Git và bản demo

Repository mã nguồn: https://github.com/KidsfitEdu/KidsfitCRM

Demo đã xuất bản riêng tư:
https://kidsfit-crm-demo-20261024.manhtuong0503.chatgpt.site

Site project ID: `appgprj_6adc5c8b3df0819197d26d7ec5aa1ecc`.
Source commit của Site: `2a9ea0cfa7cd99746ca158b94f10001d8898a5e0`.
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
