# KIDSFIT CRM — Decision: retire school allocation disputes

**CONFIRMED — 2026-11-19:** The unfinished `SchoolDispute` feature is out of scope for KIDSFIT CRM and has not been used with real business data.

Remove the BGĐ menu/page, shared school-operations tab, public create/resolve endpoints, commands, permission and its role grants, EF entity/model, and the dedicated `school_disputes` table via a new EF migration. An old `/crm/role-board-disputes` bookmark redirects to Tổng quan rather than rendering a retired screen.

**Keep unchanged:** CHECKEE reconciliation `DISPUTED` status and `DisputeReason`, audit history, protection-ownership conflict detection, and financial approval. Do not remove CHECKEE reconciliation screens or shared role types by substring matching.

**Data safety:** No production migration was executed. Run on a disposable MySQL 8.4 database first; confirm any target database has no records requiring retention before applying. Existing `InitialCRM` migrations remain unchanged.
