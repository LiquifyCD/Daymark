# Daymark

An iPhone-ready daily check-in PWA hosted on GitHub Pages.

**Live app:** https://liquifycd.github.io/Daymark/

## Architecture

- GitHub Pages hosts the static purple No-Comment app.
- A small Cloudflare Worker provides the API.
- Turso stores promises and check-ins.
- One private account signs in through the Worker and receives a time-limited signed session.
- The Turso token stays in the Worker and is never shipped to the browser.

The username is fixed to `Liquify`. The password and session-signing key are
stored only as Cloudflare Worker secrets.

## Local development

```powershell
npm.cmd install
npm.cmd run dev
```

## Verification

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd audit --omit=dev --audit-level=high
```
