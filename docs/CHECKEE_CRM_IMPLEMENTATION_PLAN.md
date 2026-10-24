# Kế hoạch triển khai CRM bán hàng CHECKEE

Tài liệu sản phẩm chuẩn nằm tại [CHECKEE sales CRM product reference](../.agents/skills/kidsfit-crm-development/references/checkee-sales-crm.md). Kế hoạch này tổ chức thứ tự triển khai; không thay thế các quyết định sản phẩm còn mở.

Yêu cầu trường học từ PDF/Excel bổ sung được quản lý tại
[kế hoạch CRM trường học](SCHOOL_CRM_IMPLEMENTATION.md). Quy trình xác minh trường
học mới thay thế mốc bảo vệ theo ngày ký của bản cũ, không sửa hợp đồng lịch sử.

## Mục tiêu MVP

MVP phải cho phép nhân sự KIDSFIT/đối tác đăng ký quyền tiếp cận khách hàng, chống đăng ký trùng trong 5 ngày, báo cáo hợp đồng để xác lập quyền bảo vệ 5 năm, theo dõi doanh thu thực thu và tính hoa hồng có thể đối soát.

Kiến trúc tiếp tục dùng ASP.NET Core .NET 10, React 19, EF Core 10 và MySQL 8.4 trong modular monolith hiện tại. Phạm vi mới là bounded context `ChannelSales`; không đổi nghĩa các bảng lead/học viên/lớp học đang có.

## Trạng thái triển khai ngày 24/10/2026

Đã triển khai local:

- Tổ chức/membership, chín nhóm tài khoản, scope cá nhân/tổ chức/toàn hệ thống; CHECKEE chỉ đọc dữ liệu phục vụ đối soát.
- Đăng ký tiếp cận, nhận diện trùng chính xác, khóa MySQL, idempotency gắn với actor/nội dung/resource và retry có giới hạn cho lock timeout/deadlock.
- Báo hợp đồng, quyền bảo vệ 5 năm, gói sản phẩm, khoản phải thu và đối soát trong cùng transaction.
- Phiếu thu chống thu trùng/vượt; commission ledger giữ phiên bản chính sách, cơ sở tính và bút toán tăng/giảm riêng.
- Đối soát xác nhận/tranh chấp có timeline. Chỉ hoa hồng đã xác nhận mới được tập hợp vào phiếu chi.
- Lập/duyệt/ghi nhận đã chi theo nhân sự và kỳ, mã giao dịch chống trùng, khấu trừ có lý do, lịch sử phiếu chi; không sửa ledger gốc khi chi.
- Đối tác cấp hoặc tạm ngưng CTV; chính sách có phiên bản mới và hạn mức, không sửa hồi tố.
- Năm tab React, gồm danh bạ trường học/nhập Excel/hạn mức CTV; hồ sơ/timeline khách hàng, ghi nhận CSKH sau ký, form có kiểm tra và dialog hỗ trợ bàn phím.
- Integration tests trên MySQL 8.4 trong database tạm: concurrency, rollback, retry, expiry, permission scope và luồng từ hợp đồng đến payout.

Mặc định của bản local: 120 giờ, tiền nguyên VND, kỳ tháng theo Asia/Ho_Chi_Minh; hoa hồng từ thực thu. Hợp đồng cũ giữ mốc bảo vệ theo ngày ký; hợp đồng thuộc danh bạ trường học mới cần Quản lý kiểm tra -> CHECKEE xác minh -> KIDSFIT ghi nhận, bảo vệ 5 năm từ ngày xác minh hợp lệ. Gói sản phẩm, tỷ lệ 10%/12% và hạn mức 20%/15% là dữ liệu minh họa. Chính sách mới có hiệu lực sớm nhất ngày mai; điều chỉnh vào kỳ hiện tại/kỳ sau, không ghi đè khoản đã chi.

Đã có nhập Excel danh bạ trường theo mẫu với xem trước/cảnh báo và phân trang. Các hạng mục chưa nghiệm thu go-live: chốt chính sách thực tế, import hợp đồng/doanh thu có đối soát, upload bằng chứng hợp đồng có kiểm soát, phân trang/export quy mô lớn, nhắc việc tự động, backup/restore rehearsal và pilot staging. Nút ghi nhận đã chi chỉ lưu giao dịch đã thực hiện, không kết nối ngân hàng để chuyển tiền.

## Thứ tự triển khai

### Giai đoạn 0 — Chốt nghiệp vụ và prototype

Đầu ra:

- Chốt 10 quyết định mở trong tài liệu sản phẩm, ưu tiên cách tính 5 ngày, khóa nhận diện khách hàng, ngày bắt đầu bảo vệ 5 năm và trigger hoa hồng.
- Wireframe cho: tra cứu khách hàng, đăng ký tiếp cận, danh sách đang bảo vệ, báo cáo hợp đồng, đối soát CHECKEE, doanh thu/hoa hồng.
- Danh mục gói CHECKEE ban đầu và bộ dữ liệu nhập khách hàng nếu có.
- Ma trận quyền + phạm vi dữ liệu được ký duyệt.

Điều kiện hoàn tất: có ví dụ thực tế cho ít nhất một luồng nhân viên nội bộ, một CTV đối tác, một xung đột đăng ký và một hợp đồng có thu tiền nhiều lần.

### Giai đoạn 1 — Nền tảng tổ chức và phân quyền

Đầu ra:

- Organization/membership cho KIDSFIT, CHECKEE và đối tác.
- Permission policies và row scope cho chín nhóm tài khoản.
- Quản lý CTV thuộc đúng đối tác.
- Audit cho thay đổi tài khoản, quyền và phạm vi.

Kiểm thử trọng tâm: người dùng không thể đọc hoặc sửa dữ liệu ngoài tổ chức/đội nhóm dù gọi API trực tiếp.

### Giai đoạn 2 — Danh bạ khách hàng và bảo vệ 5 ngày

Đầu ra:

- Customer directory, chuẩn hóa mã số thuế/điện thoại/email/domain và cảnh báo trùng.
- `RegisterCustomerApproach` có transaction, row lock và idempotency.
- Ba trạng thái hiển thị `AVAILABLE`, `APPROACHING`, `CONTRACTED` cùng đồng hồ hết hạn phía server.
- Activity, follow-up, danh sách “của tôi/đội nhóm/đối tác”.
- Hết hạn tự động/lazy-safe; hệ thống vẫn đúng nếu background worker chạy chậm.

Kiểm thử trọng tâm: hai request đồng thời chỉ có một người thắng; request còn lại nhận lỗi xung đột rõ ràng; sau đúng thời hạn người khác đăng ký được.

### Giai đoạn 3 — Hợp đồng và bảo vệ 5 năm

Đầu ra:

- Danh mục sản phẩm/gói CHECKEE.
- `ReportSignedContract` tạo hợp đồng, chi tiết gói, quyền sở hữu và doanh thu dự kiến trong một transaction.
- Tài liệu/bằng chứng hợp đồng theo chính sách đã chốt.
- Màn hình CHECKEE xác nhận, tranh chấp và xử lý đối soát.
- Cảnh báo hợp đồng/quyền bảo vệ sắp hết hạn.

Kiểm thử trọng tâm: retry không tạo hai hợp đồng; lỗi ở bất kỳ bước nào rollback toàn bộ; chỉ thao tác hợp lệ mới tạo trạng thái `CONTRACTED`.

### Giai đoạn 4 — Doanh thu, hoa hồng và thực lãnh

Đầu ra:

- Lịch thu và phiếu thu/doanh thu thực thu.
- Chính sách hoa hồng có phiên bản, ngày hiệu lực và phạm vi đối tác/sản phẩm.
- Commission ledger append-only với accrual, điều chỉnh, đảo, duyệt và chi trả.
- Kỳ payout theo tháng; số thực lãnh tách rõ thu nhập, khấu trừ và điều chỉnh.
- Dashboard cho kế toán, quản lý, nhân viên và CTV theo phạm vi.

Kiểm thử trọng tâm: không thu trùng, không chi hoa hồng trùng, không áp chính sách mới hồi tố, lịch sử đã chi không bị sửa/xóa.

### Giai đoạn 5 — Chăm sóc khách hàng, báo cáo và hardening

Đầu ra:

- Bàn giao khách hàng đã ký cho CSKH cùng lịch sử cần thiết.
- Dashboard Ban giám đốc và quản lý bán hàng.
- Export có phân quyền, masking PII và audit.
- Rate limit, backup/restore rehearsal, monitoring, truy vấn/index review và kiểm thử tải các điểm tranh chấp.
- Runbook xử lý tranh chấp, sửa sai doanh thu/hoa hồng và sự cố đồng bộ.

Điều kiện hoàn tất: nghiệm thu end-to-end từ đăng ký tiếp cận đến payout và đối soát trên môi trường staging dùng MySQL 8.4.

## Backlog ưu tiên

### P0 — Bắt buộc trước khi pilot

- Customer identity/deduplication.
- Organization + row-scoped RBAC.
- Bảo vệ 5 ngày chống race condition.
- Báo cáo hợp đồng và bảo vệ 5 năm.
- Audit/activity đầy đủ.
- Doanh thu thực thu, chính sách hoa hồng versioned và payout cơ bản.
- CHECKEE confirm/dispute.

### P1 — Sau pilot

- Nhắc follow-up và sắp hết hạn.
- Import khách hàng/hợp đồng/doanh thu có đối soát lỗi.
- Dashboard theo đội nhóm/đối tác/sản phẩm.
- CSKH và lịch sử hỗ trợ.
- Export định kỳ cho kế toán/đối tác.

### P2 — Khi có nhu cầu đã xác nhận

- Đồng bộ trực tiếp CHECKEE/kế toán.
- Chia hoa hồng nhiều cấp hoặc nhiều người.
- Workflow phê duyệt động theo giá trị hợp đồng.
- Thông báo email/SMS/Zalo và realtime.

Không đưa P2 vào hạ tầng ban đầu nếu chưa có yêu cầu vận hành cụ thể.

## Chiến lược dữ liệu và migration

1. Thêm module/bảng mới theo hướng additive; không đổi nghĩa bảng CRM giáo dục hiện tại.
2. Nhập customer directory vào staging table, chuẩn hóa và xuất báo cáo trùng trước khi đưa vào canonical tables.
3. Không tự động merge theo tên gần giống.
4. Mọi tiền tệ dùng `DECIMAL(19,0)` nếu chỉ dùng VND.
5. Mọi thời điểm bảo vệ dùng UTC; timezone kinh doanh chỉ dùng để hiển thị/cắt kỳ báo cáo.
6. Migration chạy bằng job riêng trước API; rollback dữ liệu dùng nghiệp vụ đảo/điều chỉnh, không xóa audit/tài chính.

## Chiến lược kiểm thử và phát hành

- Unit tests: status policy, permission policy, commission formulas và kỳ hiệu lực.
- MySQL integration tests: unique keys, collation, row locks, deadlock/retry, expiry và transaction rollback.
- API tests: authorization + row scope cho từng nhóm tài khoản.
- E2E React: đăng ký, bị chặn trùng, hết hạn, báo cáo hợp đồng, ghi nhận thu, xem hoa hồng.
- Pilot theo một đội bán hàng nội bộ và một đối tác trước khi mở toàn bộ.
- Feature flags cho đối soát CHECKEE và hoa hồng nếu chính sách chưa chốt.

## Tiêu chí Go-live

- Không tồn tại hai quyền bảo vệ active cho cùng customer identity trong kiểm thử concurrency.
- Báo cáo quyền truy cập chứng minh chín nhóm tài khoản chỉ thấy đúng dữ liệu.
- Số hợp đồng, thực thu, commission ledger và payout đối soát về cùng số liệu mẫu đã duyệt.
- Backup đã restore thử thành công; migration staging đã chạy trên bản sao dữ liệu.
- Có người chịu trách nhiệm xử lý dispute, override, payout và lỗi đồng bộ.
- Các quyết định sản phẩm còn mở đã được ký duyệt hoặc bị loại khỏi phạm vi go-live.
