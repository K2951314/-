# v9 Smart Pricing System

## Overview
This repository uses split bundles:
- `apps/v9/price.bundle.js`: local fallback price bundle (large, low-frequency)
- `apps/v9/stock.bundle.js`: local fallback stock bundle (small, high-frequency)
- `apps/v9/runtime-config.js`: remote source config for price/stock

Current bandwidth strategy:
- Stock: remote-first (`stock-data` branch CDN), local fallback.
- Price: lazy load on first search, remote manifest + hashed file, local fallback.

Netlify publish root is `apps/v9`.

## Project Layout
- `apps/v9/`: production query UI
- `tools/sync_stock_bundle.mjs`: stock sync tool
- `tools/publish_price_bundle.mjs`: price hash publish tool
- `.github/workflows/sync-stock.yml`: scheduled stock publish
- `.github/workflows/publish-price.yml`: manual price publish
- `.github/workflows/ci.yml`: CI tests

## Required Config
- `config/system.json`
- `config/stock-source.json`
- `config/stock-source.schema.json`

GitHub Secrets:
- `STOCK_SOURCE_URL` (required)
- `STOCK_SOURCE_TOKEN` (optional)

## Stock Source Validation
Use this to verify the source is downloadable data, not a page:
```powershell
curl.exe -L -o NUL -w "http:%{http_code} type:%{content_type}`n" "online-stock-link"
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

Publish hashed price locally (for verification):
```bash
npm run publish:price
```

Run doctor:
```bash
npm run doctor
```

## Netlify Deploy
1. Connect repo to Netlify.
2. Build command: empty.
3. Publish directory: `apps/v9` (or keep `netlify.toml`).

## Runtime Loading Policy
- No manual stock URL input in UI.
- Price is not loaded on page open; it is loaded on first `智能匹配`.
- Remote failure falls back to local files:
  - price fallback: `apps/v9/price.bundle.js`
  - stock fallback: `apps/v9/stock.bundle.js`

## Workflows
### sync-stock
File: `.github/workflows/sync-stock.yml`
- Schedule: `cron: "0 16 * * *"` (daily at 00:00 Beijing time)
- Pull stock source.
- Conditional request with ETag/Last-Modified when available.
- Publish only `apps/v9/stock.bundle.js` to branch `stock-data`.
- Commit only when content changed.

### publish-price
File: `.github/workflows/publish-price.yml`
- Trigger: `workflow_dispatch` (manual)
- Input: `apps/v9/price.bundle.js` from `main`
- Output to `stock-data` branch:
  - `apps/v9/price/price.<sha256-12>.bundle.js`
  - `apps/v9/price-manifest.json`
- Commit only when hash changed.

## Change Sync Frequency Later
Edit `.github/workflows/sync-stock.yml`:
```yaml
on:
  schedule:
    - cron: "0 16 * * *"
```

Common cron examples (UTC):
- Hourly: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Every 12 hours: `0 */12 * * *`
- Daily 00:00 Beijing: `0 16 * * *`

## Notes
- Netlify should track only `main`.
- High-frequency stock/price remote artifacts should stay in `stock-data`.
- Price bundle may remain encrypted; password prompt appears when lazy-loading price on first search.
