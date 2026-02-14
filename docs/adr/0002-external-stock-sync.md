# ADR 0002: External Stock Source + GitHub Actions Sync

## Status
Accepted

## Context
Inventory is maintained externally and changes frequently.
The deployed query app is static (Netlify), so periodic pull-and-publish is needed.

## Decision
Use `tools/sync_stock_bundle.mjs` with `GitHub Actions` schedule to pull stock source and regenerate:
- `apps/v9/stock.bundle.js`

Configuration is centralized in:
- `config/system.json`
- `config/stock-source.json`

Production source URL/token are provided by repository secrets:
- `STOCK_SOURCE_URL`
- `STOCK_SOURCE_TOKEN`

## Consequences
- No server runtime required for inventory updates.
- Strong dependency on source link quality and content type validation.
- Workflow security and path governance become part of release quality gate.
