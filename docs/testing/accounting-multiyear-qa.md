# Kế toán — kiểm thử nhiều năm (KC-02 / thanh toán / phiếu chi)

> Chỉ sử dụng MySQL 8.4 **cô lập**, có `--seed-demo` được chủ động bật, tài khoản giả và chứng từ giả. Không chạy khởi tạo schema/SQL ghi dữ liệu lên DB shared/production.

## Mục đích

Một hợp đồng gốc, nhiều kỳ tái ký từ 2026 đến 2036; có kỳ theo tháng và kỳ theo năm; nhiều khoản thu trước hạn/trễ hạn và các phiếu chi Sales/Quản lý. Không tự tạo phiếu `PAID` bằng SQL để bỏ qua xét duyệt BGĐ.

## Trình tự fixture an toàn

1. Tạo DB MySQL 8.4 disposable; chạy EF migrations và seed-demo theo hướng dẫn môi trường của repository.
2. Chọn trường và hợp đồng `ACTIVE` đã được CHECKEE xác minh trong seed. Lưu mã hợp đồng.
3. Dùng luồng nghiệp vụ Sales/Quản lý tạo các hồ sơ tái ký, rồi Kế toán duyệt theo UI/API đã triển khai. Tạo cả hồ sơ chờ duyệt, cần bổ sung và đã xác nhận.
4. Tạo lịch thu qua nghiệp vụ, ghi nhận nhiều khoản thu có chứng từ giả; thử ngày thu khác năm với kỳ sử dụng để chắc chắn không đoán kỳ bằng `YEAR(received_at)`.
5. Kiểm tra hai khoản hoa hồng Sales/Quản lý theo policy **được lưu tại thời điểm thu**; chỉ tạo phiếu chi từ bút toán chưa phân bổ.
6. Gửi phiếu nháp → BGĐ phê duyệt hoặc yêu cầu bổ sung → Kế toán ghi nhận chuyển khoản cùng mã tham chiếu và chứng từ. Kiểm tra retry/idempotency, không chi trùng.
7. Kiểm tra trong Drawer tại kích thước 375 / 768 / 1024 / 1440, bàn phím/Escape, Dark mode, 200% zoom. Sau khi tạo/sửa/gửi duyệt phiếu, vị trí cuộn tại khu Hoa hồng không được nhảy lên header.

## Bộ test dữ liệu kỳ vọng

| Ca | Dữ liệu giả cần tạo | Kiểm tra |
| --- | --- | --- |
| 01 | 1 hợp đồng gốc + 10 kỳ tái ký | Không nhân bản hợp đồng gốc; mở lịch sử cũ |
| 02 | 120 khoản thu phân bổ trong 10 năm | Lọc theo năm nhận tiền, 10 dòng/trang |
| 03 | Thu năm 2028 cho kỳ dịch vụ 2027–2028 | Không gán kỳ dịch vụ bằng năm thu |
| 04 | 150 phiếu chi Sales + Quản lý | Lọc theo kỳ hoa hồng, trạng thái; thao tác không nhảy scroll |
| 05 | Nháp, cần bổ sung, chờ duyệt, đã duyệt, đã chi | Chỉ hiển thị thao tác đúng vai trò |
| 06 | Hoàn tiền / điều chỉnh policy | Không đổi phiếu đã chi hoặc bút toán lịch sử |
| 07 | GI-01 đủ mốc 12 tháng | Không tự giải phóng bảo vệ nếu chưa có quyết định hợp lệ |

## Lưu ý schema 17/11

`contract_renewals` có `contract_id` và `renewal_no`; `revenue_receipts` không có `contract_renewal_id` trực tiếp. Việc gán thu tiền về kỳ dịch vụ cần xác minh thêm projection của backend; không tự JOIN theo năm. Tiền hoa hồng ghi nhận, thực thu sau hoàn tiền và tiền đã chi là ba loại số khác nhau.

## SQL chẩn đoán chỉ đọc

```sql
SET @contract_code = 'MA_HOP_DONG_TEST';
SET @contract_id = (SELECT id FROM sales_contracts WHERE contract_code=@contract_code LIMIT 1);
SELECT renewal_no, service_start_on, service_end_on, status
FROM contract_renewals WHERE contract_id=@contract_id ORDER BY renewal_no;
SELECT YEAR(received_at) AS year_received, COUNT(*) AS receipts, SUM(amount) AS gross_amount
FROM revenue_receipts WHERE contract_id=@contract_id GROUP BY YEAR(received_at) ORDER BY year_received;
SELECT p.period, p.status, p.beneficiary_role, COUNT(*) AS count_payouts, SUM(p.net_amount) AS net_amount
FROM payouts p
JOIN payout_items pi ON pi.payout_id=p.id
JOIN commission_ledger_entries e ON e.id=pi.commission_ledger_entry_id
WHERE e.contract_id=@contract_id
GROUP BY p.period,p.status,p.beneficiary_role ORDER BY p.period DESC;
```

## Phạm vi PR

Chỉ UI và regression tests. **Chưa cung cấp fixture ghi dữ liệu 10 năm trong DB**, vì cần đi đúng luồng tài chính và không bỏ qua kiểm tra quyền/audit của backend. Bổ sung fixture tự động là bước riêng sau khi test trên DB cô lập.
