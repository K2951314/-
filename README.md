# v9 Smart Pricing System

## Overview
This repository uses a split-bundle architecture:
- `apps/v9/price.bundle.js`: low-frequency price bundle
- `apps/v9/stock.bundle.js`: local fallback stock bundle
- `apps/v9/runtime-config.js`: remote stock runtime config

Stock is synchronized from an external source via GitHub Actions.
Netlify publish root is `apps/v9`.

## Project Layout
- `apps/v9/`: production query UI
- `merger/`: browser-side merger/export tool
- `tools/`: automation scripts
- `config/`: runtime configuration and schema
- `.github/workflows/`: CI and stock sync workflows
- `docs/adr/`: architecture decisions

## Required Config
- `config/system.json`: canonical path contract
- `config/stock-source.json`: local stock-source template
- `config/stock-source.schema.json`: stock-source schema

Production source credentials should come from GitHub Secrets:
- `STOCK_SOURCE_URL`
- `STOCK_SOURCE_TOKEN` (optional)

## Stock Source Rules
Supported source kinds:
- `stock.bundle.js`
- `json`
- `csv`
- `xlsx` / `xls`

Unsupported source kinds:
- `text/html` page links (document preview/share page)

Confirm the link is a downloadable file/API (not a page):
```powershell
curl.exe -L -o NUL -w "http:%{http_code} type:%{content_type}`n" "在线表格链接"
```
Expected:
- `http:200`
- `type` is not `text/html`

## Commands
Install:
```bash
npm ci
```

Run tests:
```bash
npm test
```

Run stock sync locally:
```bash
npm run sync:stock
```

Run config/path doctor:
```bash
npm run doctor
```

## Netlify (Git Auto Deploy)
1. Push this repo to GitHub.
2. In Netlify: `Add new site` -> `Import from Git` -> select repo/branch.
3. Build command: `npm run prepare:release`.
4. Publish directory: `apps/v9` (or rely on `netlify.toml`).
5. Deploy and open site root `/`.

If you drag-and-drop manually, drag `apps/v9` only.

## Frontend Stock Loading Policy
- Manual stock URL override UI is removed.
- Query page tries remote `stock.bundle.js` from `apps/v9/runtime-config.js` first.
- If remote load fails, UI falls back to local `apps/v9/stock.bundle.js`.

## GitHub Actions
- `.github/workflows/sync-stock.yml`: scheduled stock sync
- `.github/workflows/ci.yml`: PR/push test gate

`sync-stock` workflow:
1. Loads path contract from `config/system.json`
2. Pulls source from secrets
3. Validates source kind and bounds
4. Seeds previous artifact from `stock-data` branch (for conditional request)
5. Builds temporary stock bundle artifact (`tmp/stock.bundle.js`)
6. Publishes only `apps/v9/stock.bundle.js` to branch `stock-data`
7. Commits only when file content changed

Local sync script behavior:
- `tools/sync_stock_bundle.mjs` is idempotent.
- If `byCode` hash is unchanged, it skips write and returns `changed=false`.
- When source supports ETag/Last-Modified, script sends conditional headers.

## Sync Frequency (How to Change Later)
Edit `.github/workflows/sync-stock.yml`:
```yaml
on:
  schedule:
    - cron: "0 * * * *"
```

Common examples (GitHub Actions cron uses UTC):
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Every 12 hours: `0 */12 * * *`
- Daily at 00:00 UTC: `0 0 * * *`

## Plan C Rollout (Long-Term Strategy)
To minimize Netlify bandwidth while keeping high-frequency inventory updates:
1. Keep Netlify deployment tracking only `main` (UI shell and price bundle).
2. Publish `apps/v9/stock.bundle.js` to `stock-data` branch via workflow.
3. Load stock from jsDelivr in `apps/v9/runtime-config.js` for zero-redeploy updates.
4. Apply cache policy in `apps/v9/_headers`:
   - `index.html`: revalidate on refresh
   - versioned `runtime-config.js?v=<releaseVersion>` / `price.bundle.js?v=<releaseVersion>`: immutable long cache
   - local `stock.bundle.js` fallback: revalidate

Expected outcome:
- Most high-frequency stock traffic is served by jsDelivr, reducing Netlify egress.
- Netlify mainly serves stable app shell files.
- Inventory updates no longer require Netlify redeploy.

Known trade-offs:
- Adds dependency on jsDelivr availability.
- CDN propagation can introduce short-lived staleness.
- Keep local `stock.bundle.js` as fallback if remote fetch fails.


## Release Versioning (Cache Strategy)
- Release step (`npm run prepare:release`) generates `releaseVersion` (UTC date + content hash by default).
- The script injects this version into:
  - `apps/v9/runtime-config.js` remote stock URL (`...stock.bundle.js?v=<releaseVersion>`)
  - `apps/v9/index.html` script tags (`runtime-config.js?v=<releaseVersion>` / `price.bundle.js?v=<releaseVersion>`)
- Same version: browser reuses immutable cache, no repeated large bundle download.
- New version: `index.html` revalidation picks new query string and browser pulls fresh bundles automatically.

Post-release verification checklist:
1. Open DevTools Network and hard-disable cache off (normal cache behavior).
2. Refresh same deployed version multiple times: `price.bundle.js?v=...` should show `from memory cache` or `from disk cache`.
3. Deploy a new version and refresh: request URL changes to new `?v=...` and bundle is fetched once.

## Security Baseline (Recommended)
For static hosting, configure:
- `Content-Security-Policy`
- `Referrer-Policy`
- `X-Content-Type-Options: nosniff`

Also recommended:
- pin third-party GitHub Actions by SHA
- keep `contents` permission minimal in workflows

## Notes
- Inventory key is `code` (`byCode`).
- Price bundle can remain encrypted.
- Stock bundle remains plain text for high-frequency updates.
- Netlify should track `main` only; high-frequency stock updates are pushed to `stock-data`.
- For zero-redeploy stock updates, set `apps/v9/runtime-config.js` to jsDelivr URL of `stock-data` branch.
- When `price.bundle.js` is encrypted (`secured: true`), first visit requires password input.
