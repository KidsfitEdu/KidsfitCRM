# One-shot execution update (2026-10-30)

**IMPORTANT: this section overrides earlier blanket preservation wording in v2 for disposable demo cleanup only.** The executing agent must load `.agents/skills/kidsfit-crm-one-shot-implementation/SKILL.md`, its references and both existing domain/frontend skills, then **proceed through all phases in a single uninterrupted coding session**. Refresh existing `docs/implementation/PHASE_0_BASELINE_AUDIT.md`, rather than stopping after another read-only audit. Before altering code, classify KEEP/FIX/MERGE/REMOVE and prove dependencies. The user permits removing dead, duplicated or superseded demo-only code, including potentially out-of-scope education CRM, once imports/endpoints/DB FKs/tests prove removal safe. Do not interpret this as authorization to delete unknown real data or drop any shared DB.

**Shared demo password requirement:** all synthetic backend user accounts shall accept the *same password provided to the executing agent through local environment configuration* `Seed__DemoPassword`. The actual user-chosen password is **not** recorded in this repository. Seed only on a disposable development/test database; independent per-user password hashing, idempotent re-seed, and tests for all demo accounts are mandatory. Do not reuse this password for MySQL root/app users or JWT key; frontend static preview login is separate. For database dump, use `mysqldump` only against an isolated demo/test source and validate restore in a **new** disposable DB; never commit a dump with hashes or personal data.

**Completion model:** all safe phases run continuously, with stage checkpoints and one final PR; do not request approval for ordinary code refactors. Block only unresolved business policies, any unknown/real data deletion or production-destructive operations. Keep professional code quality, CI, migration verification and role-scoped tests.

# Master Prompt v2 — Nâng cấp KidsfitCRM theo từng giai đoạn

**Trạng thái:** Hướng dẫn cho coding agent, **không tự thực thi**. **Source baseline:** nhánh `develop` commit `0b30cbf28397a453628aedabf863ebb3a101cd6a` (kiểm tra 30/10/2026). Agent phải đọc lại HEAD mới trước khi thao tác.

## Lệnh khởi chạy ngắn (sao chép vào coding agent trong thư mục repository)

> Đọc `AGENTS.md`, `docs/README.md`, hai skill trong `.agents/skills/`, `docs/requirements/`, `docs/implementation/CURRENT_SOURCE_MAP.md`, `docs/implementation/PHASED_DELIVERY_PLAN.md` và toàn bộ file `docs/prompts/MASTER_CRM_IMPLEMENTATION_PROMPT.md`. Thực hiện **từ Giai đoạn 0**, lần lượt qua Quality Gates; tái sử dụng code, được dọn/xóa code demo đã chứng minh dư thừa sau dependency audit; không xóa dữ liệu thật, audit hoặc tài chính; seed tài khoản demo dùng biến môi trường Seed__DemoPassword, không ghi mật khẩu rõ vào Git. Chỉ dùng database test độc lập, không tự thao tác production; báo cáo và tạo PR theo giai đoạn, không merge.

## Vai trò và mục tiêu

Bạn là senior .NET 10/EF Core 10/MySQL 8.4 + React 19/TypeScript/Vinext/Tailwind CSS 4 engineer. Nâng cấp **KidsfitCRM đang tồn tại**, không dựng dự án mới. Điều chỉnh Backend, Frontend, RBAC, dữ liệu, migrations, test, seed demo và tài liệu cho **nghiệp vụ 7 vai trò** đã được duyệt. Phân biệt **mục tiêu nghiệp vụ** với **hiện trạng code**; không tuyên bố đã triển khai nếu chưa có test.

### BẮT BUỘC trước mọi thao tác

1. Chạy/kiểm tra `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git fetch` khi có quyền; không ghi đè file người khác chưa commit. Tạo feature branch riêng từ `develop` ở commit được kiểm tra. Repository mặc định `main`, **không** phát triển trực tiếp trên `main`/`develop`.
2. Đọc theo thứ tự `AGENTS.md` → `docs/README.md` → `docs/requirements/{CRM_FUNCTIONAL_SPECIFICATION,ROLES_AND_PERMISSIONS,BUSINESS_RULES,BUSINESS_WORKFLOWS,DECISION_LOG,CODEBASE_GAP_ANALYSIS}.md` → `docs/implementation/{CURRENT_SOURCE_MAP,PHASED_DELIVERY_PLAN}.md` → `.agents/skills/kidsfit-crm-development/SKILL.md` và references phù hợp → `.agents/skills/kidsfit-crm-frontend-design/SKILL.md` + `docs/design/FRONTEND_DESIGN_SYSTEM.md` + `frontend/docs/architecture.md`.
3. Bảo vệ các bounded context đang hoạt động: Leads, Parents, Students, Courses, Classes, Enrollment, Billing bên cạnh School/Channel Sales. **Reuse → fix → extend → tested refactor**; không tự xóa source, routes, components, entities, legacy roles, quyền, lịch sử ownership, migration đã áp dụng, audit, ledger hoặc hợp đồng.
4. KHÔNG `DROP`/`TRUNCATE`/`RESET` DB; không tự chỉnh migration đã áp dụng, seed lại DB thật, thay chính sách tiền hay phân quyền vượt phạm vi. Không kết nối production, shared DB, không chạy script có tác dụng phụ khi chưa xác thực nguồn DB. Không commit SQL dump thật, bí mật hoặc PII.
5. Không tự quyết định nghiệp vụ **OPEN**. Phân đoạn bị chặn thì ghi `BLOCKED_BY_POLICY`, đưa ra đầu vào cần BGĐ/KIDSFIT duyệt và tiếp tục các công việc độc lập an toàn.
6. Chỉ báo test `PASS` khi thực sự đã chạy và có bằng chứng; dùng `FAIL`, `SKIPPED`, `NOT_RUN`, `BLOCKED` đúng nghĩa. Không claim visual QA nếu chưa mở giao diện trên browser.
7. Khi có việc lớn: mỗi giai đoạn PR/commit riêng; chỉ merge qua review, không tự merge. Tạo checkpoint và báo cáo theo mẫu cuối tài liệu.

## Source map chính xác (phải đối chiếu HEAD hiện tại)

**Backend**
- API: `backend/src/KidsfitCRM.Api/Program.cs`; `Features/SchoolActions.cs`, `SchoolAllocationActions.cs`, `SchoolProposalActions.cs`, `SchoolEndpoints.cs`, `SchoolOperationsEndpoints.cs`, `ChannelSalesAccess.cs`, `ChannelSalesContracts.cs`, `ChannelSalesFinanceActions.cs`, `SchoolFinanceActions.cs`, `SchoolCareActions.cs`.
- DB: `Infrastructure/KidsfitDbContext.cs`, `SchoolModelConfiguration.cs`, `SchoolOperationsModelConfiguration.cs`, `Infrastructure/Migrations/`, `DatabaseSeeder.cs`, `CrmScenarioSeeder.cs`.
- Tests: `backend/KidsfitCRM.slnx`, `backend/tests/KidsfitCRM.Api.Tests/`, `backend/test-mysql.ps1`.

**Frontend**
- Vinext routes: `frontend/src/app/` (KHÔNG `frontend/app/`); shell `frontend/src/components/crm/crm-app.tsx`, `frontend/src/components/layout/`; roles/views `frontend/src/screens/{Admin,SalesManager,SalesStaff,Collaborator,Checkee,Board,Accounting,CustomerCare,Auth}/`; shared UI `frontend/src/components/common/`.
- `frontend/src/config/{navigation,role-pages,routes}.ts`, `frontend/src/services/`, `frontend/src/lib/demo-auth.ts`, `frontend/src/app/globals.css`.
- Tests: `frontend/tests/`, `.github/workflows/frontend-refactor.yml`. `frontend/demo/` và `vite.pages.config.ts` là bản preview riêng; preview không chứng minh API thật.

**Rủi ro script:** `start-local.ps1` tự provision MySQL local và gọi `--migrate --seed-demo` (có tác động tới credential local); `compose.yaml` chứa job `api-migrate` và cấu hình demo. `backend/test-mysql.ps1` dùng `KIDSFIT_TEST_MYSQL_ADMIN` có khả năng tạo/xóa DB test. **Không gọi các script như lệnh kiểm thử read-only**. Phải xác nhận DB test độc lập và backup trước khi có ghi dữ liệu.

## Nghiệp vụ bắt buộc và ranh giới

| Mã | CONFIRMED / PROVISIONAL / OPEN | Quy tắc |
| --- | --- | --- |
| BR-01–04 | CONFIRMED | 7 business roles: ADMIN, DIRECTOR (BGĐ KIDSFIT), ACCOUNTANT, SALES_MANAGER, CUSTOMER_SERVICE, CHECKEE, SALES. Nhân viên & CTV là chung business-role SALES; cả hai được tự đăng ký hoặc nhận trường và có mặc định **10 trường đang tiếp cận đồng thời**. Admin được thay quota có audit; không thu hồi quyền hợp lệ khi giảm quota. |
| BR-05–07 | CONFIRMED | 5 ngày đầu; mỗi lần gia hạn được duyệt **7 ngày**, tối đa **3 lần/đợt**; không ghi đè người mới có quyền hợp lệ sau khi người trước hết hạn. |
| BR-08–11 | CONFIRMED | Sales → direct Sales Manager (KIDSFIT hoặc đối tác) → Admin cho đề xuất trường; tách 3 trạng thái tổng quan khỏi pipeline và verification. |
| BR-12–13 | CONFIRMED | Sales → Manager KIDSFIT/đối tác → **trực tiếp CHECKEE** xác minh → KIDSFIT ghi nhận bảo vệ 5 năm từ thời điểm CHECKEE xác minh hợp lệ; BGĐ giám sát, không duyệt từng hợp đồng; Admin không tham gia khâu hợp đồng thường ngày. |
| BR-14,17–18 | CONFIRMED | Kế toán ghi từng đợt thanh toán, CSKH bàn giao, KIDSFIT vận hành CRM và CHECKEE được xem trong scope xác minh; bảo toàn lịch sử. |
| BR-15 | PROVISIONAL | Hoa hồng Sales **dự kiến 30%**; không tự áp dụng làm chính sách ACTIVE hoặc khoản phải chi. |
| BR-16 | CONFIRMED | Không xây tính năng người giới thiệu/chia hoa hồng riêng. |
| O-01–08 | OPEN | Cơ sở và thời điểm tính 30%, người KIDSFIT được quyền cuối cùng `SchoolProtectionGrant`, SLA giữ quyền lúc chờ gia hạn, phạm vi trường chính/phân hiệu, các trường hợp hoàn/hủy... phải được duyệt riêng. |

**Legacy compatibility:** `DatabaseSeeder.cs` còn `BOARD`, `CUSTOMER_CARE`, `CHANNEL_SALES`, `PARTNER_ADMIN`, `PARTNER_COLLABORATOR`. Đây là codes đang có, **không xóa DB role rows** khi thống nhất cách gọi sản phẩm; thiết kế alias/permission mapping và kiểm thử tổ chức.

## Giai đoạn và Quality Gates

### 0 — Audit & baseline (read-only)
- Kiểm tra source HEAD, `git status`, docs, skills, EF migration history, quyền theo tổ chức, real vs demo, CI; không sửa runtime.
- Ghi ma trận `Rule → API/Action → Entity/Migration → Frontend Screen → Tests → Status` với `VERIFIED`, `NEEDS_FIX`, `PARTIAL`, `MISSING`, `LEGACY_COMPAT`, `BLOCKED_BY_POLICY`.
- Chạy build/lint/unit test **không ghi DB**; tách integration/MySQL tới DB test được cho phép. Ghi nhận lỗi nền (pre-existing) thay vì xóa test.
- **GATE 0:** có audit file-level + baseline kết quả cụ thể + thứ tự sửa theo P0/P1/P2.

### 1 — DB safety & migration planning
- Inventory các migration hiện có, `KidsfitDbContext`, role_user, memberships, School/Contract/Revenue/Ledger; snapshot trước thay đổi.
- Nếu cần, migration additive mới, backfill có kiểm tra, không sửa migration cũ; đánh giá backup & rollback/forward fix.
- Chỉ chạy trên **database MySQL 8.4 test độc lập và có dữ liệu giả lập**, xác nhận connection string/port, tạo backup, kiểm chứng restore sang DB khác khi dự định thay đổi có rủi ro; không chạy trên DB người dùng.
- **GATE 1:** migration pass + kiểm tra row counts/quan hệ + restore/rollback plan; thay đổi mâu thuẫn OPEN bị chặn, phần khác được tiếp tục.

### 2 — Backend roles, quotas & organization scope
- Xem `SchoolActions.cs`: `IsCollaborator()` đang dùng để bỏ quota cho Sales khác; sửa logic để cùng áp dụng hạn mức **10** cho Sales employee/CTV trong cả tự đăng ký và nhận lời mời, đồng bộ màn hình Capacity và endpoint `/school-capacities`.
- Alias `BOARD→DIRECTOR`, `CUSTOMER_CARE→CUSTOMER_SERVICE`, `CHANNEL_SALES/SALES/PARTNER_COLLABORATOR→SALES`, `PARTNER_ADMIN/SALES_MANAGER→SALES_MANAGER` ở business view nhưng không phá DB/permission cũ; scope partner phải được giữ.
- Test cùng một school/2 Sales, 2 school/1 slot, quota 9→10→11, giảm quota còn quyền cũ; quyền xem PII/tenant isolation.
- **GATE 2:** API authorization + quota concurrency tests pass, account legacy không mất truy cập hợp lệ.

### 3 — School proposal, approaches, extensions
- `SchoolProposalActions.cs` đã có `PENDING_MANAGER → PENDING_ADMIN`; **reuse** thay vì tạo lại API. Kiểm tra manager assignment/forward, Admin canonical update, idempotency và versioned edits.
- `SchoolAllocationActions.cs` dùng active `SchoolWorkflowPolicyVersion` với `MaxExtensionDays/Count/Total`; biểu diễn policy hiện hành **5 ngày + 7×3** bằng phiên bản phù hợp và kiểm thử 3 lần duyệt, lần 4 từ chối. Không sửa chính sách tài chính lẫn SLA đang OPEN.
- Kiểm tra lịch sử liên hệ, demo, hoạt động, hết hạn, quyền sở hữu và chuyển giao hợp lệ; không tự giữ quyền vô thời hạn khi pending.
- **GATE 3:** transaction/race/stale-owner/tenant tests pass.

### 4 — Contract, CHECKEE verification, 5-year protection
- `SchoolEndpoints.cs` có review và grant; `SchoolActions.ReviewSchoolContract` và `GrantSchoolProtection` đã tồn tại. Trước khi code thêm, chứng minh Manager KIDSFIT & partner chuyển CHECKEE được, đủ validation/audit.
- CHECKEE xác minh không đồng nghĩa đã grant; kiểm tra `ReconciliationCase` confirmed và contract trạng thái đúng trước ghi 5 năm.
- **OPEN:** người được KIDSFIT ủy quyền `SchoolProtectionGrant`. **Không** chuyển quyền hoặc auto-grant khi chưa có phê duyệt; kiểm thử đường đi độc lập và báo blocker.
- **GATE 4:** Manager→CHECKEE verified and negative-grant tests pass; quyền OPEN được giữ an toàn.

### 5 — Finance & CSKH
- Giữ `RevenueReceipt`, schedule, commission policy snapshots/ledger, payouts/refunds, case bàn giao và audit.
- Kiểm tra thu nhiều đợt, outstanding, hợp đồng hủy/hoàn, idempotency, quyền Sales chỉ xem của mình; chính sách 30% vẫn `PROVISIONAL`.
- Không thêm referrer, không thay số tiền đã chi hoặc quyền lợi cũ.
- **GATE 5:** financial/CSKH integration tests pass trên DB test.

### 6 — Frontend incremental
- Tôn trọng `frontend/src/`, Vinext và `frontend/docs/architecture.md`; tái sử dụng `AppPageHeader`, `AppButton`, `AdminListPanel`, `AppPagination`, components thật trong `src/components/common/`.
- `SalesStaffWorkspace` và `CollaboratorWorkspace` vẫn có trong `crm-app.tsx`: xây shared Sales UX và adapter/aliases theo phạm vi, **không xóa route IDs** hay các hành vi cũ không liên quan.
- Dựa vào skill UI + Design System; kiểm tra role-based visibility và backend guards, loading/error/empty, search/reset/refresh, responsive (375/768/1024/1440), dark mode và accessibility.
- **GATE 6:** frontend lint/TS/build/demo/pages test, browser smoke nếu có môi trường; không claim screenshot QA nếu chưa render.

### 7 — Synthetic seed, database dump & restore (phân biệt)
- **Seed**: tái sử dụng `DatabaseSeeder.cs` + `CrmScenarioSeeder.cs`; chỉ `--seed-demo` trên DB local **disposable**. Dữ liệu giả: role mapping, KIDSFIT/CHECKEE/partner, Sales đạt quota, proposal manager/admin, extension lần 1–3 và lần 4 bị từ chối trong test, CHECKEE hợp đồng, receipts, CSKH, overdue; idempotent khi seed lại.
- **Dump**: export là backup; nếu đụng data thật phải có xác nhận riêng, dùng credential an toàn, snapshot nhất quán, không ghi vào Git; restore **vào database test khác** rồi kiểm tra số hàng và ràng buộc.
- Không gọi `start-local.ps1` hoặc compose như là lệnh read-only; không seed dữ liệu công nợ/hoa hồng thực tế khi policy chưa duyệt.
- **GATE 7:** seed idempotency, dump test/restore evidence (hoặc đánh dấu `NOT_RUN` với lý do).

### 8 — Integration, regression, security
- Backend: `dotnet test backend/KidsfitCRM.slnx`.
- MySQL PowerShell `backend/test-mysql.ps1` **chỉ** khi `KIDSFIT_TEST_MYSQL_ADMIN` trỏ tới DB test độc lập có thể CREATE/DROP.
- Frontend trong `frontend/`: `npm ci`; `npm run lint`; `npx tsc --noEmit`; `npm run test:demo`; `npm run build`; `npm run build:pages`; `npm run test:pages`.
- CI browser: `.github/workflows/frontend-refactor.yml` và `frontend/tests/browser/role-smoke.test.mjs` khi môi trường cho phép.
- Kiểm thử quyền, concurrency, migrations, proposal, gia hạn, CHECKEE, finance, CSKH, demo vs API thật, mobile/dark/a11y, regression CRM giáo dục cũ.
- **GATE 8:** có kết quả `PASS/FAIL/SKIPPED/NOT_RUN/BLOCKED` từng test; test fail phải giải quyết hoặc ghi tồn đọng chính xác.

### 9 — Docs, skills, handoff, PR
- Cập nhật `docs/requirements/CODEBASE_GAP_ANALYSIS.md`, `docs/implementation/`, `frontend/docs/architecture.md`, tests và references nếu source đổi.
- Đối chiếu đường dẫn thực trong repo, liên kết Markdown, nội dung `CONFIRMED/PROVISIONAL/OPEN`, đặc biệt không thay đổi business decision bất ngờ.
- Commit theo giai đoạn, PR nhỏ và review được. **Không tự merge**.
- **GATE 9:** báo cáo có commit/PR URLs, những chức năng giữ nguyên, file thay đổi, migration impact, actual test evidence, blocked decisions, next safe actions.

## Mẫu báo cáo bắt buộc của coding agent sau mỗi giai đoạn

```text
PHASE: N — <name>
BASE COMMIT / BRANCH:
STATUS: PASS | FAIL | PARTIAL | BLOCKED
REQUIREMENTS VERIFIED:
REUSED / PRESERVED:
CHANGED FILES:
SCHEMA / MIGRATION / DATA IMPACT:
TESTS RUN + EXACT RESULTS:
NOT_RUN / SKIPPED REASONS:
OPEN POLICIES / BLOCKERS:
COMMIT / PR:
NEXT SAFE PHASE:
```

**Thực thi từ Giai đoạn 0.** Khi có block về policy hay rủi ro dữ liệu, chỉ tạm dừng phần liên quan; không tự bỏ qua gate, không tự đoán nghiệp vụ và không khởi tạo thay thế source code đã tồn tại.
