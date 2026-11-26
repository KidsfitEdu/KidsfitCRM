# API contracts — KIDSFIT CRM

**Code snapshot:** `develop` at `4e9c99db374c082289608c60573a7894ee375834`, 2026-11-21. This documents known contracts from static source inspection, **not a complete OpenAPI specification or an executed integration result**. Always inspect actual endpoint code before implementing a consumer.

## Source and conventions
- Backend entry: `backend/src/KidsfitCRM.Api/Program.cs`; route mapping: `Routing/ApiEndpoints.cs` and feature-specific endpoint files.
- Frontend API transport: `frontend/src/services/api.client.ts`, base URL provided by `NEXT_PUBLIC_API_URL` (normally ending `/api`), with JWT Bearer token.
- Backend `ConfigureHttpJsonOptions` sets `JsonNamingPolicy.SnakeCaseLower` and `DictionaryKeyPolicy = JsonNamingPolicy.SnakeCaseLower`. Therefore **JSON names are snake_case** even when C# records use PascalCase. Prefer explicit contract tests for actual HTTP binding; a direct C# action invocation does not verify the JSON layer.
- `ApiValidationException` is mapped to HTTP **422** with `{ message, errors }`; `ApiConflictException` to **409**; missing record to **404**. Authentication/authorization, rate limiting, network failures and unexpected 5xx need distinct client feedback.
- `createApiClient` reads response JSON `message` or the first `errors` entry, wraps errors in `ApiRequestError`, and does not expose raw server exceptions to end users.

## Authentication and current-user account endpoints
Mapped in `Routing/ApiEndpoints.cs`. Confirm bearer protection and per-route rate limits in source.

| Method/path relative to `/api` | Request contract | Runtime responsibility |
| --- | --- | --- |
| `POST /login` | `email`, `password` | User credential validation, JWT issuance |
| `GET /me` | JWT | Current user/profile and permissions |
| `PATCH /me` | `name`, `phone` | Self-service contact profile |
| `POST /me/change-password` | `current_password`, `new_password`, `confirm_password` | Validate prior password; hash replacement; change `security_stamp`; invalidate outstanding reset challenges |
| `POST /logout` | JWT | Response endpoint; frontend clears its session token |
| `POST /auth/password/forgot` | `email` | Start recovery |
| `POST /auth/password/verify-otp` | `email`, `otp` | OTP verification |
| `POST /auth/password/reset` | `email`, `reset_token`, `new_password`, `confirm_password` | Reset verified account password |
| `GET/POST/DELETE /me/avatar` | JWT; upload is multipart | Private user avatar |

### Password-change validation and error semantics
- `ChangeOwnPasswordRequest` in `AuthFeatures.cs` receives nullable C# `CurrentPassword`, `NewPassword`, `ConfirmPassword` through the snake_case JSON policy.
- Missing current password, new password outside **12–200 characters**, mismatched confirmation, wrong current password, or unchanged new credential cause validation errors (HTTP 422).
- Successful password change rotates `security_stamp` and returns a success message requiring login again; old JWT claims no longer match the stored stamp.
- Password change has fixed-window rate limiting (currently 5 attempts per 15 minutes; inspect `Program.cs` before relying on this number). Client should distinguish HTTP 429, 401 and 422 from server 5xx.
- The screenshot-reported 5xx must be diagnosed through runtime server logs, database schema and exact HTTP status. A correct JSON request fixes a known contract bug, but does **not prove** the cause of the reported 5xx.
- Never write plaintext passwords, OTPs, reset tokens, Authorization headers, password hashes or full credential payloads into logs, screenshots, CI or docs.

## Changing an API
1. Trace endpoint → DTO → request serialization → validation/permissions → feature action → EF entities → frontend consumer.
2. Update typed contract plus frontend and backend tests for successful and invalid JSON input; test via real HTTP where practical.
3. Preserve existing public routes/response fields unless an explicitly reviewed breaking change is authorized.
4. Run scope-specific tests and use isolated MySQL for database integration. Record PASS/FAIL/NOT RUN; don't imply that direct-method tests exercise HTTP serialization.
