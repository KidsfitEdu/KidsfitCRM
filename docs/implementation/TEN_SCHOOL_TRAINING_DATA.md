# Ten-school training scenario (2026-11-04)

## Scope and provenance

This profile uses the **first ten main schools** in the user-provided `CRM_Import_Truong_Hoc.xlsx`, in original order: `SCH0001`–`SCH0010`, with **nine branches attached to `SCH0001`**. The public repository contains **only school names, codes, wards and branch names**. It must not contain the source contact names, detailed addresses, mobile numbers or emails.

The original 12-column records are available only through a **private local workbook path** supplied by the operator. The selected source remains the authoritative source for contacts; missing values stay null. For local use, `CRM_10_Truong_Hoc.xlsx` is an extracted 19-row workbook with the same `DANH_SACH_TRUONG` sheet, columns and original values; never commit or attach it to a public GitHub PR.

Training workflow states are **synthetic** and not facts about any school. `SCH0001` and `SCH0002` are simulated active contracts with two CSKH agents; `SCH0003`–`SCH0006` cover manager/CHECKEE review; `SCH0007` and `SCH0008` cover live approaches; `SCH0009` is available with a pending allocation; `SCH0010` is available. Separate proposed schools are fictional and do not replace or overlap the official ten-school directory.

## Isolated MySQL 8.4 setup

Run **only on a freshly created, owned disposable development/training database**. `--seed-demo` is an implementation command; it is never a production action. The seed refuses production mode, requires an explicit disposable flag, and refuses an unrelated existing directory.

Set these configuration values via private environment variables or a local secret configuration (never commit the secret):

- `Seed__DisposableDatabase=true`
- `Seed__TenSchoolScenario=true`
- `Seed__AccountingScenarios=false`
- `Seed__DemoPassword=<test-only password from the operator's private environment>`
- `Seed__SchoolWorkbookPath=<absolute local path to CRM_10_Truong_Hoc.xlsx>` (optional, strongly preferred for exact source contact fields)
- `ConnectionStrings__MySql=<isolated MySQL 8.4 connection string>`
- Proper separate nonproduction JWT signing key and other connection settings.

From the repository root, on an isolated DB only:

```bash
dotnet run --project backend/src/KidsfitCRM.Api -- --migrate --seed-demo
```

The operator must confirm and back up any existing disposable DB before seeding. **Do not seed a production/shared database or an existing database with real records.** A successful CI on its ephemeral database is not proof of the operator's local database contents.

If a private workbook is provided during the **first** seed, source contact details are stored in that isolated database, not in the repository. When no path is supplied, only the nonpersonal school names and ward fields are loaded; contacts remain empty. Avoid mixing the redacted variant and private workbook variant in the same database: the profile intentionally does not overwrite existing official school rows, and a later import with different content hashes needs an explicit approved data migration/reconciliation.

## Seven roles and realistic cross-role workflow

- Admin: official school directory and nine branches, proposal approval, personnel and capacity, and assignment of two CSKH agents.
- Director: overdue proposal and open dispute, scoped dashboards, authorized policy oversight.
- Sales Manager: own direct Sales/CTV, allocation, pending extension, contract review and departure handover.
- Sales/CTV: 5-day approach claims, call/meeting log, pending invitation and income read under existing role scope.
- CHECKEE: independent contract verification queue and a synthetic software-error ticket.
- CSKH: two distinct accounts, each with one assigned verified contract; usage guidance is only an activity log, a software fault becomes a CHECKEE support ticket.
- Accountant: schedule and partial receipts on the two active simulated contracts; no unauthorized payout or commission is asserted.

The experimental financial receipts are not bank confirmations. **No 30% commission policy is activated by this profile**; the base, rate and trigger remain subject to BGĐ/Kế toán approval. Payment proof and legally effective contracts must not be fabricated or relabeled as authentic.

## UI behavior and labeling

The backend-connected experience is the functional source of truth. Without a configured API the frontend has a **read-only** ten-school catalog for presentations; it cannot promise persistence, approval or financial transactions. Visible record names do not have `(demo)` suffixes, but the presentation environment still has an appropriate **Môi trường thử nghiệm** notice and simulated records must not be taken as official transactions.

Backend permission checks, tenant and direct-manager scope, locked/idempotent writes and append-only financial/audit history remain in force. Users must sign in through the real API for cross-role workflow tests. A public browser preview is not authentication.

## Acceptance / replay checks

1. Exactly 10 `directory_schools` and 19 `school_units` on a fresh scenario database; `SCH0001` has 9 `BRANCH` records.
2. Re-running the scenario does not duplicate customers, units, claims, contracts, receipts, invitations, support tickets or proposals.
3. Two active contract assignments have different CSKH agents and one `SYSTEM_ERROR` routed to CHECKEE.
4. Manager/CHECKEE/CSKH/Accounting/Director/Sales views respect permission and organization limits.
5. `commission_policy_versions` contains no newly activated 30% rule in the ten-school profile.
6. Frontend lint, TypeScript, static preview tests, build and browser routing pass.
7. Perform separate staging UAT before considering real data or contracts.

**Data policy:** This is training fixture data, not evidence that any real school signed a CHECKEE contract, reported a software incident or paid KIDSFIT.
