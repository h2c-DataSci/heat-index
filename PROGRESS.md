# Progress

Running log of tasks and work done on `h2c-DataSci/heat-index`.  
Update this file on every task. Keep it factual and dated.

## Hard rule

- `PROGRESS.md` — so we do not get lost.
- `README.md` — so context is preserved.
- Both files are updated and kept current on every task for this project.

## Current state (latest baseline)

- Branch: `main`
- Baseline tip: `7d3c36e` — Set current state in PROGRESS.md to latest tip
- Live: https://h2c-datasci.github.io/heat-index/ (GitHub Pages from `main` / root)
- Offline under `/heat-index/` verified (service worker activates, shell cached, page and `app.js` render offline)
- Formula, PAGASA bands, and developer link unchanged
- This state is the latest baseline as of 2026-11-08.

## Work log

### 2026-11-08 — Project setup and clone

- Cloned https://github.com/h2c-DataSci/heat-index into `/workspace/artifacts/heat-index` as the official local version.
- Confirmed minimal contents at that point: `index.html`, `README.md`.

### 2026-11-08 — CI hardening review and merge (PR #1)

- Reviewed PR #1 (“Add least-privilege offline static site validation”).
- Diff only added `.github/dependabot.yml`, `.github/workflows/validate-site.yml`, `test/validate_site.py`. Live `index.html` and README were unchanged.
- Check **Validate HTML and JavaScript** passed.
- Proposed (not applied) main-branch protections: require PRs and conversation resolution, require the validation check, block force-push and deletion; do not require another reviewer or Pages deployment checks for a solo workflow.
- Merged PR #1 to `main` as `b09f29b`.

### 2026-11-08 — App source: CSP, offline shell, a11y/CLS

- Commit `502991f`.
- Added compatible CSP meta tag.
- Added versioned offline service worker.
- Reserved space on the heat-index figure (CLS).
- Replaced unsafe `innerHTML` on the figure with safe DOM updates.
- Formula, PAGASA bands, and developer link left unchanged.

### 2026-11-08 — App source: path-correct SW, external JS, Feedback link

- Commit `0424bda`.
- Service worker registers relative to `/heat-index/` (`./sw.js`, scope `./`).
- Precache paths are relative under `/heat-index/`.
- Activate deletes only caches prefixed `heat-index-`.
- Inline script moved to `app.js`; CSP `script-src` is `'self'` only (no script `unsafe-inline`).
- Feedback link added next to the unchanged developer link (`https://www.haroldhenrycabanilla.com`), opening the Google Form in a new tab with `rel="noopener noreferrer"`.

### 2026-11-08 — Offline verification under `/heat-index/`

- Loaded `http://127.0.0.1:8765/heat-index/` online.
- Service worker scope: `http://127.0.0.1:8765/heat-index/`, state `activated`.
- Cache `heat-index-shell-v2` contained `/heat-index/`, `/heat-index/index.html`, `/heat-index/app.js`, `/heat-index/sw.js`.
- Simulated network unavailable and reloaded `/heat-index/`.
- Page and `app.js` rendered offline: title intact, reading `40.4°C` / Extreme Caution, script tag present.
- No further commit required.

### 2026-11-08 — Documentation hard rule

- Replaced the stub `README.md` with standard project documentation.
- Created this `PROGRESS.md`.
- Hard rule recorded: update both files on every task going forward.
- Committed and pushed as `b0ed1e1`.

### 2026-11-08 — Baseline recorded

- Current state marked as the latest baseline.
- Baseline tip at recording: `7d3c36e`.
- Recorded in project memory and in this file and `README.md`.

- Branch protections (require PRs, conversation resolution, validation check; block force-push/deletion) proposed but not applied.
- Dependabot PRs for Actions bumps exist; left untouched per instruction.
