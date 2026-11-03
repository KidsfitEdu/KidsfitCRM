# CSKH: phân công trường và tiếp nhận lỗi kỹ thuật (2026-11-03)

## Nghiệp vụ đã chốt

- **Admin KIDSFIT** phân công/điều chuyển nhân viên CSKH cho hợp đồng **ACTIVE, đã CHECKEE xác minh**, bao gồm hợp đồng của đối tác. Quản lý bán hàng không trực tiếp phân công CSKH.
- Kế hoạch nhân sự ban đầu: **2 CSKH cho khoảng 206 trường**, không gán cứng 103 trường/người, không áp quota. Admin xem số trường và ticket còn mở để cân bằng.
- **CSKH** chỉ đọc trường/hợp đồng mình được phân công, liên hệ cơ bản, lịch sử hỗ trợ và các ticket; hướng dẫn sử dụng qua điện thoại chỉ ghi `CustomerActivity` loại `SUPPORT`, **không tạo ticket**.
- **Lỗi phần mềm** tạo `CustomerSupportCase` loại `SYSTEM_ERROR`, gắn CHECKEE và chuyển sang hàng chờ kỹ thuật. CHECKEE chỉ xem ticket được chuyển đến tổ chức mình, ghi tiến độ `CHECKEE_SUPPORT`; chỉ CSKH xử lý tiếp/đóng sau khi CHECKEE báo hoàn tất và nhà trường xác nhận.
- Giữ `OPEN`, `IN_PROGRESS`, `RESOLVED`. Hợp đồng đổi người CSKH chuyển các ticket đang mở, giữ nguyên lịch sử, chủ sở hữu Sales, bảo vệ khách hàng và thông tin hoa hồng.
- Ticket cũ có nhãn `LEGACY` và **không tự chuyển CHECKEE**; không biến ticket hướng dẫn cũ thành lỗi kỹ thuật.
- Không tạo seed 206 trường/2 tài khoản sản xuất, không dùng hạn mức 103 mặc định, không tự động phân bổ theo tỷ lệ, không làm dịch vụ thông báo/SLA mới.

## Giao diện

Thiết kế dựa trên ảnh màn hình **Chính sách vận hành** do người dùng cung cấp (chỉ là tham chiếu, không có file ảnh trong repo):
- KIDSFIT xanh lá đậm, nền sáng, tiêu đề và mô tả rõ, bảng tiêu đề xanh, bộ lọc/tìm kiếm, badge trạng thái, thao tác có nhãn, drawer/dialog và phân trang.
- Dùng lại `AppPageHeader`, `AdminListPanel`, `AdminListToolbar`, `AdminIconAction`, `AdminStatusBadge`, `AppPagination`, `AppDrawer`, `AppDialog`.
- Admin: **Phân công CSKH**. CSKH: **Tổng quan**, **Trường phụ trách**, **Ticket lỗi hệ thống**. CHECKEE thêm **Hỗ trợ kỹ thuật** độc lập với xác minh hợp đồng.
- Các bookmark CSKH Trường bàn giao / Theo dõi chăm sóc cũ được điều hướng về Trường phụ trách.
- Bản demo không có Backend: chỉ đọc, không có dữ liệu trường thật hoặc hành động ghi dữ liệu.

## API mới

Các đường dẫn bên dưới có tiền tố `/api/channel-sales`.

| Method | Path | Quyền |
|---|---|---|
| GET | `/care/assignments` | `SchoolCareAssign` + `ChannelSalesAllScope` + `ChannelSalesIdentityManage` |
| POST | `/contracts/{id}/care-handover` (tái sử dụng) | Admin KIDSFIT như trên; chỉ người nhận thuộc KIDSFIT |
| GET | `/care/schools`, `/care/schools/{id}` | CSKH được phân công |
| POST | `/care/schools/{id}/calls` | CSKH được phân công; chỉ ghi `CustomerActivity` |
| GET | `/care/tickets`, `/care/summary` | CSKH được phân công |
| POST | `/customer-support-cases` (tái sử dụng) | CSKH được phân công; tạo ticket `SYSTEM_ERROR` và gửi CHECKEE |
| POST | `/customer-support-cases/{id}/progress` (tái sử dụng) | CSKH phụ trách; không `RESOLVED` khi CHECKEE chưa hoàn tất kỹ thuật |
| GET | `/checkee/support-cases` | CHECKEE technical support + membership đúng tổ chức |
| POST | `/checkee/support-cases/{id}/progress` | CHECKEE ghi kỹ thuật, không được chuyển `RESOLVED` |

Tất cả danh sách mới có phân trang phía server. Giao diện Admin hiện cho phép phân công/điều chuyển **từng hợp đồng**, hiển thị tải công việc để cân đối. Chưa triển khai phân công hàng loạt hoặc tự động phân bổ; đây là mở rộng tùy chọn, **không phải đã có**.

## Dữ liệu và an toàn

- Dùng lại `sales_contracts`, `channel_customers`, `contract_care_handovers`, `customer_support_cases`, `customer_activities` và `audit_logs`.
- Migration mới `20261103163000_CskhTechnicalSupport` chỉ bổ sung cột/khóa ngoại/index, mặc định `ticket_type=LEGACY`; không xóa ticket hiện có.
- RBAC trong migration tạo permission `channel_sales.school.technical_support.handle` nếu chưa tồn tại, cấp cho role `CHECKEE` và `ADMIN` nếu có; thu hồi quyền `channel_sales.school.care.assign` khỏi role `SALES_MANAGER`. Các vai trò, memberships và user hiện hữu được giữ.
- Tài khoản Admin phải có `ChannelSalesAllScope`, `ChannelSalesIdentityManage`, `SchoolCareAssign`; đơn vị `KIDSFIT`, `CHECKEE` cần tồn tại và ACTIVE.
- Không chạy migration, seed, import, xóa hay dump cơ sở dữ liệu production trong quá trình phát triển. Trước release cần backup, thử migration và smoke test trên staging có dữ liệu đại diện.
- `Down` migration không tự xóa dữ liệu ticket, cần quy trình rollback có xem xét.

## Nghiệm thu quan trọng

1. Admin phân công hợp đồng CHECKEE đã xác minh cho CSKH KIDSFIT; Manager bị từ chối dù còn legacy permission.
2. CSKH A không xem/ghi nhật ký cho trường của CSKH B; Admin phân công lại thì A mất quyền và B nhận ticket còn mở.
3. Hướng dẫn sử dụng chỉ tạo `CustomerActivity SUPPORT`, không vào hàng chờ CHECKEE.
4. Ticket lỗi phần mềm vào đúng CHECKEE, chỉ CHECKEE có quyền mới được cập nhật kỹ thuật.
5. Không cho CSKH đóng ticket lỗi trước khi CHECKEE trả kết quả; CHECKEE không được đóng thay.
6. Bảng Admin và CSKH có tìm kiếm, phân trang, trạng thái tải/rỗng/lỗi và thao tác có xác nhận.
7. Kiểm thử EF migration, role seed replay, MySQL 8.4 và các unit/integration/browser tests trước PR.

## Giới hạn và quy trình triển khai

- Đây là thay đổi trên nhánh `feat/cskh` từ `develop`, không merge hay sao chép nguyên PR #50.
- CI trên nhánh có thể tạm thời thêm trigger push để chạy test **trước PR**, sau đó khôi phục workflow về điều kiện ban đầu.
- Cần UAT với Admin, 2 nhân viên CSKH và CHECKEE trên staging trước khi áp dụng trên dữ liệu 206 trường.
