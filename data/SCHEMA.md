# Portfolio Data Schema

All dashboard data lives in `data/portfolio.json`.
This file is the single source of truth — updated by the Upload page each month.

---

## Top-level structure

```json
{
  "account": { ... },
  "snapshots": [ ... ],
  "positions": [ ... ],
  "transactions": [ ... ],
  "income": [ ... ]
}
```

---

## `account`

| Field | Type | Description |
|-------|------|-------------|
| `number` | string | BMO account number |
| `name` | string | Account / club name |
| `inception_date` | string (YYYY-MM-DD) | Date account was opened |

---

## `snapshots[]` — one entry per month-end

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (YYYY-MM-DD) | Month-end date |
| `total_cad` | number | Total portfolio value in CAD |
| `cad_holdings` | number | Value of CAD-denominated holdings |
| `usd_holdings_usd` | number | Value of USD holdings in USD |
| `fx_rate` | number | USD/CAD rate used for conversion |
| `net_invested_ytd` | number | Net deposits minus withdrawals year-to-date |
| `net_invested_inception` | number | Net invested since account inception |
| `market_change_ytd` | number | Market gain/loss year-to-date in CAD |
| `market_change_inception` | number | Market gain/loss since inception in CAD |

---

## `positions[]` — one entry per holding per month-end

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (YYYY-MM-DD) | Month-end date |
| `ticker` | string | Exchange ticker (e.g. GOOG, TD:CA) |
| `name` | string | Full company name |
| `shares` | number | Number of shares held |
| `cost_per_share` | number | Average cost per share |
| `total_cost` | number | Total book cost |
| `current_price` | number | Price at month-end |
| `current_value` | number | Market value in native currency |
| `currency` | string | "CAD" or "USD" |
| `current_value_cad` | number | Market value converted to CAD |
| `sector` | string | Industry sector |
| `return_inception` | number | Return since first purchase (decimal, e.g. 0.45 = 45%) |
| `return_last_month` | number | Return vs prior month-end |
| `return_last_year` | number | Return vs same month prior year |
| `pf_weight` | number | Portfolio weight (decimal) |
| `first_acquired` | string (YYYY-MM-DD) | Date of first purchase (if known) |

---

## `transactions[]` — one entry per transaction

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (YYYY-MM-DD) | Transaction date |
| `type` | string | "buy", "sell", "deposit", "withdrawal", "fx", "fee", "dividend", "interest" |
| `ticker` | string or null | Ticker symbol (null for cash transactions) |
| `description` | string | Raw description from statement |
| `quantity` | number or null | Shares bought/sold |
| `unit_price` | number or null | Price per share |
| `commission` | number | Commission paid |
| `amount` | number | Net cash impact (positive = inflow, negative = outflow) |
| `currency` | string | "CAD" or "USD" |

---

## `income[]` — dividends and interest received

| Field | Type | Description |
|-------|------|-------------|
| `date` | string (YYYY-MM-DD) | Payment date |
| `type` | string | "dividend", "interest", "distribution" |
| `ticker` | string | Source ticker |
| `description` | string | Raw description from statement |
| `amount` | number | Amount received |
| `currency` | string | "CAD" or "USD" |
| `ytd_total` | number | Year-to-date total in same currency |

---

## Adding New Fields
1. Add the field definition to the relevant table above
2. Update the extraction prompt in `js/parser.js` → `EXTRACTION_PROMPT`
3. Update display logic in the relevant page JS
4. Commit both files together
