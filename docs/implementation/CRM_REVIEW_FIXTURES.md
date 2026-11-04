# KIDSFIT CRM — Full fictional review dataset

## Provenance and scope

This is **entirely fictional data** for demonstrations, quality review and disposable development only. School names and stable `SCH0001`–`SCH0010` codes were selected for continuity with the school directory reference; **all addresses, staff names, schools' contacts, transaction amounts, school sizes, incidents, receipts and contracts are invented** and must not be treated as factual claims about the named real-world organizations. Use non-dialable `0000-` phones and non-routable `@schools.example.test` emails. Disable email/SMS/Zalo, payouts and integrations in the review environment.

The new canonical source of the dataset is `backend/src/KidsfitCRM.Api/SeedData/crm-review-data.json`. **No Excel import or external school workbook is used at runtime.** `CrmReviewSeeder` reads JSON and maps it into the existing MySQL entity relationships. The connected Frontend and all business roles consume the existing API rather than a new static mock layer.

Review profile creates 10 main schools and 9 branches under SCH0001. Two active contracts (SCH0001 & SCH0002), four contracts in manager/CHECKEE stages (SCH0003–SCH0006), two active contacts (SCH0007–SCH0008), and two available schools (SCH0009–SCH0010) have linked Sales/CTV, manager, CSKH, CHECKEE and accountant fixtures. It also includes proposal approvals/denials, one invitation, one pending extension, an open dispute, a school deferral, a software-error ticket and a CSKH handover. Seeded customer contact data, school type, student/class counts and principal/vice-principal are synthetic.

### Commission 30% — approved rate, limited calculation basis in fixture

The project owner confirmed a **30% rate for employee Sales and CTV**. For the fixture, the **illustrative calculation basis** is actual received amount minus any refunded amount, with a negative adjustment entry after a refund. It is not evidence of real payments or a policy decision about withholding, trigger, effective date or production payout automation.

Example records:
- SCH0001 collected 12,000,000 VND → Sales accrual 3,600,000 VND.
- SCH0002 collected 6,000,000 VND, refunded 1,000,000 VND → CTV accrual 1,800,000 VND, refund adjustment –300,000 VND → CTV net accrued 1,500,000 VND.
- Combined net accrued: **5,100,000 VND**.

The fixture inserts isolated, explicitly labeled `REVIEW-*` commission policy versions, and does not modify any production policy. No payment to an actual person or bank is made.

## Safety and setup

Only on a **fresh, personally owned, disposable MySQL 8.4 database**, never `kidsfit_crm` if it contains data:

```dotenv
# backend/.env — private, do not commit
ConnectionStrings__MySql=Server=127.0.0.1;Port=3306;Database=kidsfit_crm_review;User=kidsfit_crm;Password=<your-local-mysql-password>;Character Set=utf8mb4;
Seed__DemoEnabled=false
Seed__DisposableDatabase=true
Seed__ReviewFixtures=true
Seed__AccountingScenarios=false
Seed__DemoPassword=<private-testing-login-password>
Jwt__Issuer=KidsfitCRM.Api
Jwt__Audience=KidsfitCRM.Web
Jwt__Key=<nonproduction-key-at-least-32-utf8-bytes>
Cors__Origins__0=http://localhost:3000
```

If existing environment variables conflict with the file, the process environment takes priority. Development environment is required; production rejects the demo seed.

From repository root:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project backend/src/KidsfitCRM.Api -- --migrate --seed-demo
dotnet run --project backend/src/KidsfitCRM.Api
```

From `backend/`, replace the project path with `./src/KidsfitCRM.Api`. If the database was seeded with older fixtures, **do not attempt to patch/erase real or unknown rows**; create a different clean database for this review. The seeder refuses unrelated directory/customer rows, checks 10 codes + nine branches and uses stable idempotency keys.

Frontend `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8000/api`, `NEXT_PUBLIC_DEMO_MODE=false`. Restart frontend after changes and launch with `cd frontend; npm ci; npm run dev`.

Do not commit a MySQL dump containing password hashes or contact data. If portability is required, export **only from this isolated review DB**, verify restore into a second disposable DB, and do not mistake that for a source-of-truth JSON fixture.

## Acceptance

1. Exactly 10 directory school records, 19 school units, 10 linked school customers and six contract records.
2. Two paid receipts with one refund; one 30%-rate Sales and one 30%-rate CTV policy; three ledger entries totalling 5,100,000 VND.
3. Two active contract CSKH assignments, one `SYSTEM_ERROR` CHECKEE ticket; proposals, extensions, allocation and dispute visible to their authorized roles.
4. Run seed twice without duplicates; compare role scope, contact details and summaries.
5. Tests use CI's ephemeral MySQL 8.4 only. No production changes or automatic deployment.

**Known scope:** This PR does not redesign UI, replace existing static browser preview, migrate historical real databases or implement newly requested business features. All data is fictional.
