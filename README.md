# v9 Smart Pricing System

## Overview
This repository uses a split-bundle architecture:
- `apps/v9/price.bundle.js`: low-frequency price bundle
- `apps/v9/stock.bundle.js`: high-frequency stock bundle

Stock can be synchronized from an external source through GitHub Actions.
Netlify production publish root is `apps/v9` (self-contained).

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

Production source credentials should come from GitHub Secrets, not files:
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
3. Build command: keep empty.
4. Publish directory: `apps/v9` (or rely on `netlify.toml`).
5. Deploy and open site root `/`.

If you drag-and-drop manually, drag `apps/v9` only.

## Frontend Stock Loading Policy
- Production query UI reads inventory only from local `apps/v9/stock.bundle.js`.
- Manual stock URL override in frontend has been removed by design.
- Reason: avoid CORS/auth/HTML-link misuse and keep a single stable update path.

## GitHub Actions
- `.github/workflows/sync-stock.yml`: scheduled stock sync
- `.github/workflows/ci.yml`: PR/push test gate

`sync-stock` workflow:
1. Loads path contract from `config/system.json`
2. Pulls source from secrets
3. Validates source kind and bounds
4. Writes `apps/v9/stock.bundle.js`
5. Commits only when file changed

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
- Stock updates must go through GitHub Actions (`sync-stock.yml`) and Netlify auto deploy.
- When `price.bundle.js` is encrypted (`secured: true`), first visit requires password input.
