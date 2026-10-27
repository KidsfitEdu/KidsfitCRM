# Phạm vi sản phẩm hiện tại — 27/10/2026

## Quyết định đã được người dùng xác nhận

CRM tập trung đăng ký trung gian/phân phối các sản phẩm **iSchool, F&B**.
Không triển khai vận hành trung tâm đào tạo trong giao diện hiện tại.

- Menu chính: **Tổng quan** và **Đăng ký khách hàng**.
- Không hiển thị Học viên, Lớp học, Thu học phí, học thử hoặc chuyển lead thành
  ghi danh. Tổng quan không dùng số học viên, sĩ số, khóa học hay mục tiêu tuyển sinh.
- Giữ các chức năng bán hàng: khách hàng, tiếp cận/bảo vệ, danh bạ trường,
  đề xuất, phân bổ, gia hạn, hợp đồng, xác minh, doanh thu, hoa hồng, đối soát,
  đội ngũ/CTV và chăm sóc khách hàng theo quyền hiện có.
- Khách hàng có thể là trường học, tổ chức hoặc cơ sở kinh doanh F&B. Danh bạ
  trường là danh bạ khách hàng, không phải phân hệ quản lý học viên.
- Giao diện và tiêu đề dùng nhãn **iSchool & F&B**. CHECKEE tiếp tục là bên xác
  minh/đối soát trong các quy trình đã có; không tự đổi mã quyền hoặc tổ chức.

## Hướng dẫn cho các lần prompting sau

1. Đọc tài liệu này trước các baseline giáo dục cũ. Không tự đưa lại chức năng
   Học viên/Lớp học/học phí chỉ vì chúng xuất hiện trong tài liệu ban đầu.
2. Màn hình hiện tại chỉ tải `/me` và `/channel-sales/workspace` khi khởi tạo;
   các API bán hàng được tải theo chức năng. Không gọi API học viên/lớp/học phí
   hoặc danh mục khóa học để hiển thị CRM sản phẩm.
3. Đăng ký tiếp cận khách hàng và báo cáo hợp đồng là các hành động bán hàng.
   Không biến chúng thành tuyển sinh/ghi danh hoặc yêu cầu nhập thông tin trẻ em.
4. Danh mục gói, mã sản phẩm, giá và hoa hồng thật vẫn lấy từ API. Yêu cầu đổi
   phạm vi UI không cho phép đổi tên/gộp gói lịch sử hoặc tự đặt giá mới.
5. Chưa có quyết định tách quyền bảo vệ theo từng sản phẩm. Giữ nguyên quyền
   trên khách hàng và hợp đồng hiện có; không tự chia sẻ/chuyển quyền giữa nhóm sản phẩm.
6. Giữ các đề xuất SLA/gia hạn/thu hồi hoa hồng ở trạng thái DRAFT như tài liệu Notes.

## Thay đổi triển khai

- `frontend/components/crm/crm-app.tsx`: shell tập trung bán hàng, mở sẵn Đăng ký
  khách hàng; Tổng quan dùng số liệu khách hàng/hợp đồng và tài chính theo quyền.
- Giao diện giáo dục cũ lưu trong `education-crm-legacy.tsx` để giữ khả năng đối
  chiếu; không được import, định tuyến hoặc đóng gói vào ứng dụng hiện tại.
- Không xóa bảng, API, tài khoản, hóa đơn, audit hoặc dữ liệu giáo dục lịch sử.
  Không đổi quyền trên server hoặc chạy migration cho việc thu gọn giao diện.
- Bản GitHub Pages dùng cùng phạm vi menu, dữ liệu giả lập và giới hạn chỉ đọc
  của các tình huống Vận hành. Backend thật vẫn là môi trường nội bộ.

## Kiểm tra trước phát hành

- Kiểm thử tải workspace xác nhận chỉ gọi identity/bán hàng, thiếu quyền thì
  không tải dữ liệu; lỗi API không fallback sang dữ liệu giả lập.
- Kiểm thử điều hướng cho chín tài khoản mẫu không đưa lại phân hệ giáo dục.
- Artifact Pages không chứa nhãn Học viên/Lớp học/Thu học phí hoặc dữ liệu
  English Kids/Math Discovery/STEAM của giao diện cũ.
- Chạy lint, TypeScript, unit test, build ứng dụng và build/kiểm thử Pages.
  Kiểm tra giao diện local/public sau phát hành; ghi kết quả ở tài liệu triển khai.

## Kết quả xác minh local — 27/10/2026

- Lint, TypeScript, **22/22 unit test**, **2/2 kiểm thử artifact Pages**, build
  ứng dụng và build Pages đều qua. Artifact không chứa giao diện/dữ liệu đào tạo cũ.
- Đã đăng nhập local, kiểm tra menu chỉ còn hai mục, màn hình Đăng ký khách hàng
  và Tổng quan phân phối hiển thị dữ liệu API đúng quyền.
- JavaScript chính của bản Pages giảm từ khoảng 828 KB xuống 463 KB trước gzip
  do không đóng gói giao diện giáo dục cũ. Không thay bộ công cụ hoặc thư viện.
- Không sửa backend/schema; không xóa hoặc chuyển dữ liệu nghiệp vụ. Kiểm tra
  khởi động local xác nhận database đã ở phiên bản mới nhất, không áp migration mới.
