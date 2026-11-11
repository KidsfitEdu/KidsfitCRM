# Example user prompts and expected skill routing

1. `@kidsfit-crm-dev Phân tích trước khi code trang Admin quản lý trường học cho đồng bộ giao diện.` → source/design/component inventory, change plan only, do not edit.
2. `@kidsfit-crm-dev Thêm phân bổ trường cho Sales với hạn mức 10, migration MySQL và test chống đăng ký trùng.` → verify current HEAD/docs, propose/implement vertical slice, concurrency test, additive migration only if truly needed.
3. `@kidsfit-crm-dev Review PR feature/school-import so với develop.` → inspect actual diff, list verified P0/P1 issues and exact paths/lines, no invented execution status.
4. `@kidsfit-crm-dev Đặt tên branch và commit cho chức năng duyệt gia hạn.` → `feat/claim-extension`, `feat(claims): add manager extension approval`, adjust to actual scope.
5. `@kidsfit-crm-dev Đồng bộ bảng, nút, filter theo giao diện Admin.` → reuse existing AppButton, AdminListPanel/Toolbar, CSS tokens; screenshot QA only if render possible.

6. `@kidsfit-crm-dev Xác nhận trước khi code phần Thanh toán/Hoa hồng trên bảng Kế toán, dựa vào ảnh.` → inspect latest code and screenshot; propose **labels above amounts** and exact two-cell-only scope; stop before coding/Git.
7. `@kidsfit-crm-dev Chốt triển khai giao diện badge Kidsfit, tạo commit theo từng nhóm chứ không force-push.` → verify PR status/HEAD, implement role-scoped styles, run tests, push meaningful incremental commits if Git actions were approved, no automatic merge.
8. `@kidsfit-crm-dev Vì sao trạng thái Đủ 12 tháng chưa đổi?` → compare Vietnam business day to exact threshold, check `ServiceInterruptionPolicy`, `ServiceInterruptionService` and actual right/audit; explain that milestone is not release.
9. `@kidsfit-crm-dev Review chính sách hoa hồng 30%.` → rate CONFIRMED; base/trigger/tax/payout still OPEN; never turn a demo percentage into real payout.
10. `@kidsfit-crm-dev PR trước đã merge; sửa tiếp một màn hình khác.` → verify develop and merged PR, use new approved branch/PR, never reuse old branch silently.