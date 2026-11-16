# Local private evidence storage (Windows / ASP.NET Core .NET 10)

The CRM stores signed contracts, renewals, receipts and payout proof files on a private
filesystem, with metadata in `financial_evidences` (MySQL). No public file URLs,
no second upload service and no third-party object storage are required.

## Production Windows Server

Set `Storage__RootPath=D:\KidsfitCRM\Storage\Evidence` in the API process environment.
If absent, the Windows default is `%ProgramData%\KidsfitCRM\Storage`.
The directory must be outside the deployed application, `wwwroot`, Git and the IIS static-file root.

Grant the account running ASP.NET Core (or the IIS Application Pool identity)
**Modify** access to this directory; do not grant anonymous website accounts access.
Keep storage private and allow downloads only through authenticated
`GET /api/channel-sales/evidence/{id}`. The application creates subfolders
`contracts`, `renewals`, `receipts` and `payouts` as required.
Server disk keys are opaque UUIDs, not user-supplied filenames.

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
