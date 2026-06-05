# Medusa Capital Dashboard

Investment Club Portfolio Dashboard — BMO Ligne d'action Account #230-32415

## Live Site
https://elmalehanthony.github.io/medusa-capital-dashboard

## Stack
- 100% static — hosted free on GitHub Pages
- File parsing via Anthropic Claude API (client-side, no server)
- Data stored in `data/portfolio.json` (committed to repo)
- No backend, no paid hosting, no domain name

## Pages
| Page | Description |
|------|-------------|
| Dashboard | KPIs, portfolio history chart, sector allocation, top performers |
| Positions | Holdings table with filters by currency/sector/sort |
| Transactions | Full transaction log with type/currency filters |
| Income | Dividend tracker with YTD totals |
| Upload | Drop a BMO PDF or XLSX to auto-parse and update |

## Monthly Workflow
1. Receive BMO statement (PDF) or Dashboard (XLSX)
2. Go to `/upload.html`
3. Drop the file — Claude API parses it into structured JSON
4. Review the extracted data preview
5. Click **Save to Repo** — commits `data/portfolio.json` via GitHub API
6. GitHub Actions redeploys the site automatically (~30s)

## Setup
See [SETUP.md](./SETUP.md) for first-time configuration.

## Data Schema
See [data/SCHEMA.md](./data/SCHEMA.md) for field definitions and how to add new fields.
