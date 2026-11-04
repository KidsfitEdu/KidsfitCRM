-- MySQL 8.4 - read-only verification for Admin CSKH assignment and handover.
-- Run against a dedicated test database after applying existing EF Core migrations.
-- No schema migration is required: contract_care_handovers.reason is already TEXT NOT NULL.
-- No data modification is performed.

SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'contract_care_handovers'
  AND COLUMN_NAME IN ('reason', 'contract_id', 'assigned_user_id', 'previous_user_id', 'idempotency_key')
ORDER BY ORDINAL_POSITION;

SELECT COUNT(*) AS handover_count,
       SUM(CASE WHEN TRIM(reason) = '' THEN 1 ELSE 0 END) AS handovers_missing_reason
FROM contract_care_handovers;

SELECT id, contract_id, previous_user_id, assigned_user_id,
       reason, created_at
FROM contract_care_handovers
ORDER BY id DESC
LIMIT 20;

-- Expected: reason column is NOT NULL; new rows from reason-free UI contain
-- 'Admin phân công nhân viên CSKH.' or 'Admin điều chuyển nhân viên CSKH.'
-- Existing handover reasons must remain untouched.
