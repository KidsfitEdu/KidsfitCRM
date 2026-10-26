# Triển khai CRM trường học từ hai tài liệu

## Cập nhật từ Notes — 27/10/2026

Đợt `KidsfitCRM_Notes.docx` đã bổ sung đề xuất qua Quản lý/Admin, lời mời phân bổ,
xin/duyệt gia hạn có chính sách, hàng chờ quá hạn, tranh chấp, tạm hoãn, bàn giao,
chỉnh sửa trường có lịch sử, CSKH, hủy/hoàn tiền và chính sách hoa hồng theo nhóm
nhân sự. Chi tiết 39 yêu cầu, thay đổi, kiểm thử và gợi ý chính sách `DRAFT` nằm tại
[CRM_NOTES_INSTRUCTIONS_AND_ISSUES.md](CRM_NOTES_INSTRUCTIONS_AND_ISSUES.md).

Các phần bên dưới giữ nguyên làm lịch sử của đợt 24/10. Danh sách backlog cũ
không còn phản ánh trạng thái hiện tại; dùng tài liệu Notes để xác định phần đã
triển khai và phần còn chờ duyệt. Không tự giữ quyền khi đang chờ gia hạn hoặc
tự trừ hoa hồng khi hủy hợp đồng.

## Lịch sử triển khai 24/10/2026

Nguồn: `CRM_Report.pdf` (7 trang), `CRM_Import_Truong_Hoc.xlsx`
(`DANH_SACH_TRUONG!A1:L317`). Tài liệu chuẩn cho Codex nằm tại
`.agents/skills/kidsfit-crm-development/references/school-directory-workflows.md`.

## Quyết định áp dụng

- Một hồ sơ khách hàng/trường chính; phân hiệu nằm dưới trường. Bảo vệ và hạn mức
  tính một lần/trường chính. Không tự tạo mã số thuế hay số điện thoại còn thiếu.
- Nhập Excel có xem trước, kiểm tra tiêu đề, liên kết trường chính, cảnh báo chất
  lượng; xác nhận nhập là giao dịch nguyên tử, thử lại không tạo bản sao.
- Không nhập dữ liệu thật vào dữ liệu mẫu mặc định. Admin chủ động chọn file.
- Hợp đồng trường học mới theo PDF: quản lý kiểm tra, CHECKEE xác minh, KIDSFIT ghi
  nhận bảo vệ 5 năm từ ngày xác minh. Hợp đồng lịch sử giữ nguyên.
- Chưa mặc định gia hạn 7 ngày: PDF ghi rõ đây là đề xuất cần phê duyệt. Chưa tự
  đặt thời hạn giữ chỗ, ưu tiên đề xuất hay thời hạn xử lý khi chưa có chính sách.
- Danh bạ tra cứu tên/mã/khu vực được chia sẻ cho người có quyền đăng ký, kể cả đối
  tác; thông tin liên hệ chi tiết chỉ dành cho chủ hồ sơ/quản lý đúng phạm vi.
  Đây là giả định triển khai cần xác nhận trước khi đưa dữ liệu thật lên production.
- Hợp đồng chờ xác minh không tự gia hạn tiếp cận. Nếu quyền cũ đã hết và có người
  mới nhận trường, KIDSFIT không được ghi đè quyền mới khi xác minh hồ sơ cũ; cần
  xử lý tranh chấp. Báo cáo hợp đồng vẫn yêu cầu lượt tiếp cận hợp lệ; luồng bổ sung
  hợp đồng muộn/chưa có lượt tiếp cận cần chính sách thẩm quyền riêng.

## Đợt triển khai trong yêu cầu này

1. Tài liệu skill và ánh xạ nguồn có thể dùng lại cho các lần prompting.
2. Danh bạ trường/phân hiệu, nhập Excel xem trước/xác nhận, tìm kiếm/phân trang.
3. Hạn mức tiếp cận đồng thời và lịch sử điều chỉnh có lý do.
4. Quy trình xác minh hợp đồng trường học, kiểm soát bảo vệ dài hạn.
5. Kiểm thử MySQL, phân quyền, gửi trùng, rollback, đồng thời và giao diện.

## Phần tiếp theo cần chính sách được duyệt

- Đề xuất trường qua quản lý -> Admin; ưu tiên đề xuất có thời hạn.
- Mời phân bổ, chấp nhận/từ chối, bàn giao và phân bổ lại có lịch sử.
- Xin/duyệt gia hạn, giữ quyền tạm thời, chuyển cấp Ban giám đốc theo SLA.
- Hủy/chấm dứt hợp đồng, giải quyết tranh chấp và điều chỉnh tài chính theo chính
  sách được duyệt; không suy diễn công thức thu hồi hoa hồng từ PDF.
- Kênh liên hệ tổ chức, bằng chứng/tệp đính kèm riêng tư và nhắc việc tự động.

Các mục này là backlog, không được coi là chức năng đã hoàn thành.

## Kết quả triển khai và xác minh (24/10/2026)

Đã triển khai các mục 1-5 của đợt này:

- Migration additive `20261024033745_AddSchoolDirectoryWorkflow`; không sửa lịch sử
  hợp đồng cũ, không xóa dữ liệu/tài chính.
- `GET /api/channel-sales/schools?search=&page=1`: danh sách 20 trường/trang,
  tìm theo mã/tên/khu vực, đếm phân hiệu, tình trạng bảo vệ và hồ sơ xác minh.
- `GET /api/channel-sales/schools/{id}`: hồ sơ trường, các phân hiệu, liên hệ theo
  quyền, lịch sử hoạt động và các bước kiểm tra/ghi nhận hợp đồng.
- `POST /api/channel-sales/schools/import/preview` và `/commit`: multipart field
  `file`; commit cần `preview_hash` và `idempotency_key`. Giới hạn 2 MB/5.000 dòng,
  không macro, công thức hay ô gộp. Không lưu file gốc trên máy chủ.
- `GET /api/channel-sales/school-capacities`,
  `PATCH /api/channel-sales/school-capacities/{membershipId}`: hạn mức, sử dụng,
  lịch sử; thay đổi cần `{ limit, reason }` và quyền Admin.
- `POST /api/channel-sales/school-contracts/{id}/review`, CHECKEE xác minh qua
  endpoint đối soát hiện có, sau đó
  `POST /api/channel-sales/school-contracts/{id}/grant-protection`.
- Giao diện: CHECKEE Sales -> Trường học; xem trước/xác nhận nhập, tìm kiếm/phân
  trang, báo cáo hoạt động/hợp đồng, kiểm tra/xác minh, hạn mức và lịch sử.
- 55/55 kiểm thử backend chạy thành công, không bỏ qua; gồm MySQL 8.4 thật, nhập
  đồng thời, rollback khi audit lỗi, chống gửi trùng, quyền, hết hạn không worker,
  hạn mức đồng thời và không ghi đè người tiếp cận mới. Đọc được file nguồn với
  140 trường chính/176 phân hiệu và 321 cảnh báo (phần lớn thiếu điện thoại).
  Truy vấn danh sách/phân trang và ẩn liên hệ của trường chưa nhận cũng đã kiểm
  tra trên DB có dữ liệu thử, không chỉ trên danh bạ rỗng.
- Frontend lint, TypeScript và production build thành công. Còn cảnh báo kích
  thước bundle biểu đồ đã có; chưa phải tối ưu tải dữ liệu quy mô production.
- Kiểm tra trình duyệt: mở tab Trường học, hộp nhập Excel, trạng thái chưa chọn
  file, đóng bằng Escape và biểu mẫu chặn hạn mức nếu không có lý do. Preview
  Excel thật kiểm tra qua API; giao dịch nhập/xác minh kiểm tra tự động trong DB
  thử nghiệm riêng, không tạo hợp đồng/phiếu thu thử trong dữ liệu đang dùng.

### Cách sử dụng ngay

Mở `http://localhost:3000`, đăng nhập Admin -> CHECKEE Sales -> Trường học ->
Nhập danh sách Excel -> chọn `docs/CRM_Import_Truong_Hoc.xlsx` -> Kiểm tra và xem
trước -> rà soát cảnh báo -> Xác nhận nhập. File hiện chưa được nhập tự động vào
dữ liệu local. Nhập lại bản giống hệt không tạo bản sao; thay đổi thông tin trường
chính sẽ bị chặn để tránh ghi đè, phân hiệu thay đổi được coi là bản bổ sung cần
rà soát. Chưa có giao diện sửa dữ liệu danh bạ chính thức sau khi nhập.

Hạn mức hiện áp dụng theo membership CTV/tổ chức. Người bán nội bộ chưa bị gán
hạn mức của CTV. Nếu cho phép CTV làm nhiều tổ chức, cần chốt hạn mức tổng hay
riêng trước khi cấp membership thứ hai. Trước production cần duyệt các giả định
và cấp bốn quyền `channel_sales.school.*` qua quy trình quản trị thực tế; demo
seeder chỉ phục vụ môi trường local/demo, không phải quy trình cấp quyền production.
