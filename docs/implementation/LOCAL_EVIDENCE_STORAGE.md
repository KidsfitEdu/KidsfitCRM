# Local private evidence storage (Windows / ASP.NET Core .NET 10)

The CRM stores signed contracts, renewals, receipts and payout proof files on a private
filesystem, with metadata in `financial_evidences` (MySQL). No public file URLs,
no second upload service and no third-party object storage are required.

## Development (local .NET)

When `ASPNETCORE_ENVIRONMENT=Development` and no storage path is configured,
the API automatically creates a private `Storage/` directory under the API
content root, normally `backend/src/KidsfitCRM.Api/Storage/` when launching
from that project. It creates category subfolders as files are uploaded.
`backend/**/Storage/` is excluded from Git, so uploaded files and images cannot
accidentally be committed. The folder is private; do not expose it through
static-file middleware or put it in `wwwroot`.

## Production Windows Server

Without an override, the API automatically creates the persistent directory
`%ProgramData%\\KidsfitCRM\\Storage` on Windows (outside the published app).
To choose a different fixed disk, optionally set
`Storage__RootPath=D:\\KidsfitCRM\\Storage\\Evidence` in the API process environment.
Do not point Production storage into the application publish directory.
The directory must be outside the deployed application, `wwwroot`, Git and the IIS static-file root.

Grant the account running ASP.NET Core (or the IIS Application Pool identity)
**Modify** access to this directory; do not grant anonymous website accounts access.
Keep storage private and allow downloads only through authenticated
`GET /api/channel-sales/evidence/{id}`. The application creates subfolders
`contracts`, `renewals`, `receipts` and `payouts` as required.
Server filenames are opaque UUIDs with extensions derived from validated file content (`.pdf`, `.jpg`, `.png`, `.webp`), never user-supplied names. Previously stored UUID-only filenames remain readable without renaming existing files.

For direct .NET hosting, Docker is optional. The repository's `compose.yaml`
retains a persistent named volume for Docker development so container recreation
does not discard evidence files.

## Development schema cutover

`20261116120000_LocalEvidenceStorage` is a **destructive, development-only**
migration for uploaded evidence: it removes old `financial_evidences` rows and
the `bytes` BLOB column, and adds `storage_key` and `file_size`.
Existing contract, receipt, payout, ledger and audit records are not deleted.
**Do not apply this migration to a shared/production database containing
evidence that must be retained.** No BLOB backfill is implemented because the
user explicitly approved discarding development uploads.

## Reliability and cleanup

- Upload size maximum is 5 MiB. JPG/PNG/WEBP are accepted for all evidence kinds;
  PDF is accepted only for `CONTRACT` and `RENEWAL`.
- Uploads stream to disk; MIME signatures and SHA-256 are checked/computed server-side.
- Only the creator can discard an unattached proof. A periodic job removes temporary
  metadata and files left unattached after 48 hours.
- Attached financial evidence is not deleted by cleanup; business record authorization
  continues to control downloads.
- Back up **both** MySQL and the private storage directory. Restore these together
  to recover financial evidence references; do not use a source-code backup as storage backup.
- Monitoring should report disk exhaustion and missing files, and should never log
  sensitive file contents.
