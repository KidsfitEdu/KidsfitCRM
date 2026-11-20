# KIDSFIT CRM — private user avatar storage (Draft, PR review)

## Rationale and security review

The existing `IFileStorageService` stores private evidence outside `wwwroot`, assigns server-generated opaque GUID-based keys, streams input to a temporary file, and checks file signatures (JPEG/PNG/WebP/PDF). Reuse this infrastructure for avatar images through a dedicated `AVATAR` kind. An image is **not** financial evidence and must never be inserted in `financial_evidences`.

### Authorization contract

- `GET /api/me/avatar`, `POST /api/me/avatar`, and `DELETE /api/me/avatar` are mapped only in the authenticated route group. The target identity comes exclusively from validated JWT claims. No user ID, filename, storage key, organization ID, or RBAC permission provided by the client is accepted.
- Avatar bytes are downloaded with an authorization header and rendered through a temporary browser `blob:` URL. They are not publicly hosted.
- Existing JWT `security_stamp`, user ACTIVE and active organization membership checks still apply; no privilege change.
- Upload is restricted to one valid image of at most 2 MiB, JPEG/PNG/WebP based on verified magic bytes (not just filename/MIME); SVG/HTML/PDF rejected. API request size and upload frequency are bounded, and the saved filename is random.
- Return `Cache-Control: private, no-store` and `X-Content-Type-Options: nosniff` on reads. Browser object URLs are revoked when the session changes or component unmounts.
- DB stores only a nullable `users.avatar_storage_key`, never the image bytes. Migration does not delete existing user data.

## Deployment prerequisite

`Storage:RootPath` **must point to a persisted, backed-up, private volume** (outside `wwwroot`). Ensure the API process has write permissions. On a multi-instance deployment, the storage mount **must be shared between replicas**, or replace `IFileStorageService` with a private object-store implementation before enabling uploads. The current local fallback should not be assumed durable under a container image without a volume.

## Operational follow-up

- Backup and restore both the database and the private avatar folder together; the DB pointer alone is insufficient.
- There is a harmless potential orphan-file case following uncertain DB commit or file-deletion failure; log a cleanup event without file contents or identities and reconcile unreferenced GUID files with a separate maintenance process after a grace period.
- Do not enable SVG, externally accessible S3 buckets, or client-supplied storage paths.
- Current implementation reuses signature validation but does not transcode/strip image EXIF metadata. For a wider public avatar product, plan image decoding/transcoding and EXIF stripping in a subsequent enhancement.
- Visual QA on mobile/desktop, Light/Dark and accessibility required before merge. Do not merge/deploy automatically.
