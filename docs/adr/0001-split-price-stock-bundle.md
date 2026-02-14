# ADR 0001: Split Price and Stock Bundles

## Status
Accepted

## Context
Price data updates are low frequency, while stock data updates are high frequency.
Keeping one combined bundle increases operational overhead and unnecessary redeploy risk.

## Decision
Use two bundles:
- `apps/v9/price.bundle.js` for price data (can be encrypted)
- `apps/v9/stock.bundle.js` for stock data (plain text for high-frequency updates)

`apps/v9/index.html` loads both and joins by `code`.

## Consequences
- Stock updates can be automated independently.
- Price confidentiality controls remain independent.
- Query page must handle stock-source fallback when remote source fails.
