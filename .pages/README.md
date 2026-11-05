# Public demo release

This branch adds release configuration only. Existing application files are
identical to develop commit `bddb6aae02e935a9fcea431c699c59c4793d398e`.

The Vite overlay reuses the existing `LoginPage` with the existing public demo
authentication/session helpers. Only the generated public bundle substitutes
the two default login fields with public fixture values. The real API, source
files, password rules, permissions and data model are unchanged. No backend is
published. Demo accounts remain `*@kidsfit.example`, password `Demo@2026`.

From `frontend`, after `npm ci`:

```
npx vite build --config ../.pages/vite.config.mjs
npm run test:pages
```

Set `KIDSFIT_PAGES_RELEASE` to the full release commit SHA in CI. Output is only
`frontend/dist-pages`. HTML records the source/release SHAs. Vite hashes assets;
the page checks a fresh same-origin HTML response on load, focus and every minute
and refreshes once when the published release changes. GitHub controls CDN cache
headers; use the emitted `?_release=<release SHA>` URL to open a release directly.

The workflow publishes on pushes to `pages-demo`, checks the public page in a
fresh browser and records a sanitized result on `pages-demo-report`. Existing
main/develop workflows and application source remain unchanged.
