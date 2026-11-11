# KIDSFIT CRM — Quy trình làm việc với AI (2026-11-11)

## A. Các chế độ yêu cầu

| Người dùng nói | Hành động được phép | Dừng ở đâu |
|---|---|---|
| “Rà soát/phân tích trước khi code” | Đọc `develop`, PR, tài liệu, code, tests; đề xuất phạm vi + rủi ro | Dừng trước sửa code/Git |
| “Chốt triển khai” sau một kế hoạch đã duyệt | Triển khai đúng kế hoạch, kiểm thử, báo cáo; Git khi đã được chốt | Không tự merge/deploy |
| “Code và tạo PR” | Branch/commit/push/PR theo chuẩn, kiểm thử theo SHA | PR Draft nếu còn lỗi hoặc chưa nghiệm thu |
| “Sửa UI giống ảnh” | Phân tích đúng thành phần người dùng chỉ định; dùng design tokens, render QA nếu có | Không sửa nghiệp vụ ngoài phạm vi |
| “Review PR” | So sánh diff, kiểm tra tests/permission/business impact; ghi kết quả có mức độ | Không code/merge nếu chưa yêu cầu |
| “Merge/deploy” | Chỉ thao tác khi phê duyệt cụ thể, đủ quyền và qua các điều kiện release | Báo cáo chứng cứ và rủi ro |

## B. Trình tự 8 bước

1. **Xác định mục tiêu** — UC/BR, vai trò, màn hình, API, dữ liệu, tiêu chí chấp nhận, ảnh tham chiếu, những phần không được sửa. Nếu người dùng yêu cầu xác nhận trước, chỉ làm tới bước 3.
2. **Chọn nguồn đúng** — kiểm tra `develop` HEAD, issue/PR, `AGENTS.md`, `DECISION_LOG.md`, requirements, source map, skill nội bộ rồi mã nguồn và test hiện hữu. Trạng thái `OPEN` phải nêu rõ.
3. **Bản phân tích trước code** — bảng `Yêu cầu | Hiện trạng | File liên quan | Giải pháp | Kiểm thử | Rủi ro`. Đối với UI mô tả bố cục chi tiết, trạng thái, hành vi nút, responsive, theme.
4. **Tách phạm vi thành nhóm thay đổi** — backend/DB trước nếu cần, sau đó API contract, frontend, data demo, kiểm thử. Không lập thêm migration, màn hình hoặc package nếu chỉ cần sửa component.
5. **Thực hiện** — tuân thủ phân quyền server + tổ chức + record scope, giữ backward compatibility, migration an toàn, trường học hợp đồng gốc và tái ký không nhân đôi, không N+1, dùng finance ledger chuẩn.
6. **Kiểm thử** — lint, typecheck, unit, integration MySQL 8.4 cô lập, build, browser visual QA khi có. Không coi npm lint xanh là đã kiểm thử giao diện. Chỉ thông báo PASS nếu có kết quả thực.
7. **Commit và PR** — nhóm commit theo thay đổi độc lập, ví dụ `feat(accounting)`, `style(accounting)`, `test(accounting)`. Không viết lại commit đã push. Xem diff và staged files; PR hướng `develop`, mô tả thay đổi, test, ảnh trước/sau, tác động migration, phần còn mở. Chỉ merge theo chỉ đạo.
8. **Bàn giao** — xuất báo cáo đúng SHA, CI, PR và trạng thái merge/deploy. Nêu blocker và cách kiểm tra thủ công; tuyệt đối không khẳng định phần chưa được thực hiện.

## C. Checklist từng lớp

**Frontend:**
- Sử dụng `frontend/src/screens/` và `frontend/src/components/common/` hiện hữu, không tạo implementation trùng.
- Responsive 375/768/1024/1440; table overflow trong bảng, không tràn toàn trang; contrast Light/Dark; keyboard/focus; icon-only có label.
- Badge của Dịch vụ ≠ Cần xử lý; nhãn ngắn + icon; màu Kidsfit theo ý nghĩa, không dùng màu đơn thuần để biểu đạt.
- Kiểm tra search, filter/reset, pagination, drawer, confirm/reject, loading/error/empty và số tiền định dạng VND.

**Backend/DB:**
- RBAC server + tenant/ownership scope cho từng endpoint, kể cả aggregation.
- Transaction, audit, idempotency, concurrency; tránh logic trong UI; không tin dữ liệu client.
- MySQL 8.4/InnoDB/utf8mb4; migrations additive, dữ liệu tồn tại và quan hệ PK/FK an toàn.
- Không chạy `--migrate`, `--seed-demo`, `start-local.ps1`, compose/mysqldump trên DB có dữ liệu thật khi chưa có phê duyệt và backup rõ ràng.

**KIDSFIT-specific:**
- KC-02: hợp đồng gốc khác hồ sơ tái ký; một hợp đồng gốc có nhiều kỳ; kế toán duyệt hồ sơ tái ký theo quyền.
- GI-01: 12 tháng lịch, ngoại lệ/decision, audit; ngày đạt mốc không tự có nghĩa đã hết bảo vệ.
- 5 năm: theo xác minh hợp lệ và quy tắc tự động được code chấp nhận, không cấp thêm quyền tùy tiện.
- Finance: tổng giá trị hợp đồng, thực thu (sau hoàn tiền), hoa hồng ghi nhận/đã chi là các số khác nhau.

## D. Quy tắc chia commit — không “một commit mãi mãi”

- Commit **theo nhóm thay đổi có thể review độc lập**. Ví dụ:
  1. `feat(accounting): aggregate contract renewal workspace`
  2. `refactor(accounting): reuse shared status presentation`
  3. `style(accounting): improve payment and commission labels`
  4. `test(accounting): cover renewal and GI-01 boundary cases`
- Không bắt buộc số lượng cố định và không bắt buộc tạo test-only commit khi tests gắn chặt với thay đổi; tránh chuỗi `fix bug` không có ý nghĩa.
- Sau khi push: **không force-push/rebase/amend** trừ khi người dùng duyệt việc viết lại lịch sử cụ thể; tạo commit mới cho sửa bổ sung.
- PR đã merge thì không push tiếp vào nhánh cũ mà cần kiểm tra phạm vi mới và tạo nhánh/PR phù hợp nếu người dùng yêu cầu Git.

## E. Mẫu kết quả bàn giao

```text
Phạm vi: <UC/BR + màn hình/vai trò>
Hiện trạng: <đã làm / còn thiếu / sai khác docs>
Branch: <tên + base HEAD>
Commits: <SHA1 — ý nghĩa>; <SHA2 — ý nghĩa>
PR: <URL + Draft/Open/Merged>
Frontend: lint [PASS/FAIL/NOT RUN], tsc [...], tests [...], build [...]
Backend/MySQL: build [...], integration [...], migration [...] (DB cô lập)
Visual QA: desktop [...], mobile [...], Dark Mode [...]
Giữ nguyên: <RBAC, API, finance, historical data...>
Rủi ro / OPEN: <nghiệp vụ chưa được duyệt hoặc chưa test>
Merge / deploy: <đã / chưa + chứng cứ>
```

## F. Prompts mẫu

**Xác nhận trước:** “@kidsfit-crm-dev Rà soát phần Kế toán → Hợp đồng & hoa hồng trên `develop` và PR đang mở. Phân tích UI, API, MySQL, quyền, component tái sử dụng; đề xuất file và tests. Chưa code, commit hoặc tạo PR.”

**Chốt triển khai:** “Chốt triển khai đúng phạm vi vừa duyệt. Sửa code, chạy CI và tạo các commit có ý nghĩa theo từng nhóm; nếu đã chốt tạo PR thì mở PR vào `develop`, không force push hoặc tự merge.”

**Code review:** “Review PR #... so với HEAD `develop`, tập trung nghiệp vụ KC-02/GI-01, data scope, audit, các test thực tế; phân loại P0/P1/P2 và không sửa code.”