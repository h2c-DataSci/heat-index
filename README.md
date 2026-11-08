# Heat Index

Heat index calculator for Philippine workplaces. Converts ambient air temperature and relative humidity into the meteorological heat index, classifies it on the DOST-PAGASA effect-based bands, and shows tiered employer controls drawn from DOLE Labor Advisory No. 08, series of 2023.

Live site (GitHub Pages, `main` / root):  
https://h2c-datasci.github.io/heat-index/

Developer: Engr. Harold Henry G. Cabanilla  
https://www.haroldhenrycabanilla.com

## What it does

- Accepts temperature (°C or °F) and relative humidity.
- Computes the heat index with the NWS Rothfusz regression (Steadman first estimate below 80 °F; low- and high-humidity adjustments where applicable).
- Adds the conventional full-sun load of +15 °F when “Direct sunlight” is selected. Shade uses the meteorological index only.
- Maps the selected exposure (rounded to 0.1 °C) to PAGASA bands:
  - Below 27.0 °C — Normal / Safe
  - 27.0–32.9 °C — Caution
  - 33.0–41.9 °C — Extreme Caution
  - 42.0–51.9 °C — Danger
  - 52.0 °C and above — Extreme Danger
- Lists the matching DOLE Labor Advisory No. 08-23 controls (lower tiers remain in force).

The formula, the risk bands, and the existing “About the developer” link are preserved as-is.

## Layout

| File | Role |
|------|------|
| `index.html` | App shell, styles, CSP, markup |
| `app.js` | Calculator logic (external, no inline script) |
| `sw.js` | Offline app-shell service worker |
| `test/validate_site.py` | Offline HTML structure + inline/external JS syntax smoke check |
| `.github/workflows/validate-site.yml` | CI: SHA-pinned, least-privilege validation on push/PR to `main` |
| `.github/dependabot.yml` | Weekly GitHub Actions dependency updates |
| `PROGRESS.md` | Running log of tasks and work done |
| `README.md` | This document |

## Local use

Serve the directory (or a parent so the path is `/heat-index/`) and open the page:

```bash
python3 -m http.server 8080
# then open http://127.0.0.1:8080/heat-index/  (or / if served from this folder)
```

The service worker registers relative to the page (`./sw.js`, scope `./`) and precaches the shell under `/heat-index/`. Cache names are prefixed `heat-index-`; activation deletes only those prefixes.

## Security notes

- Content-Security-Policy meta tag: `script-src 'self'` (no script `unsafe-inline`). Styles still allow `'unsafe-inline'` for existing inline styles and Google Fonts.
- Service worker is least-privilege and offline-only for the app shell.
- No secrets, no form posts from the page. Feedback opens an external Google Form in a new tab (`rel="noopener noreferrer"`).

## CI

Pull requests and pushes to `main` run **Validate HTML and JavaScript** (`.github/workflows/validate-site.yml`). It is a smoke check (structure + `node --check`), not full HTML conformance or a security scan.

## Baseline

Latest baseline on `main`: `2d06d85` (2026-11-08). Recorded from `7d3c36e`.  
Offline under `/heat-index/` verified. Formula, PAGASA bands, and the developer link are unchanged.

## Hard rule

`PROGRESS.md` and `README.md` are kept current on every task.  
`PROGRESS.md` is the work log so the project does not get lost.  
`README.md` preserves context for the next person (or the next session).
