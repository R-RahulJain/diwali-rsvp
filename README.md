# Diwali RSVP

Single-page RSVP site. Static HTML/CSS/JS on GitHub Pages; Google Sheet + Apps Script as the backend. Guest names and codes live only in the Sheet.

## Setup

1. **Create a Google Sheet.** Rename the first tab to `Guests` with headers in row 1: `name`, `party_size`, `code`, `link`. (The script adds `timestamp`, `response`, `food`, `liquor`, `soft_drinks`, `snacks` itself.)
2. **Add the scripts.** In the Sheet: Extensions > Apps Script. Paste `apps-script/Code.gs` into `Code.gs`. Add a second file (+ > Script) and paste `tools/make-codes.gs`. In `make-codes.gs` check `BASE_URL` matches your Pages URL.
3. **Paste your guest list** into the `name` and `party_size` columns (e.g. `Adhi and Aarthi`, `2`). Leave `code` and `link` empty.
4. **Generate links.** Reload the Sheet, then RSVP > Generate links (authorise on first run). Each guest gets a 6-character code and a full link in the `link` column. Copy each into WhatsApp. Running it again only fills missing codes.
5. **Deploy the web app.** In Apps Script: Deploy > New deployment > Web app. Execute as: **Me**. Who has access: **Anyone**. Copy the URL ending in `/exec`.
6. **Paste the URL** into `APPS_SCRIPT_URL` in `config.js`, commit, push.

After changing `Code.gs` later, use Deploy > Manage deployments > edit > New version (the URL stays the same).

## Changing event details

Edit the `EVENT` block in `config.js` (name, date, time, venue, Maps link, dress code, liquor note). Push to `main`; Pages updates in a minute.

## How it works

- `GET <web app>` returns `{count}`, the sum of `party_size` for guests who said Yes.
- `GET <web app>?g=CODE` returns only that guest's `{name, party_size, response, food}`.
- `POST` (as `text/plain`, so no CORS preflight) validates the code and updates that guest's row under a lock. One row per code, so changing an RSVP never duplicates.
