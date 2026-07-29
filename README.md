# Daymark

An iPhone-ready daily check-in PWA hosted on GitHub Pages.

**Live app:** https://liquifycd.github.io/Daymark/

## Architecture

- GitHub Pages hosts the static purple No-Comment app.
- A small Cloudflare Worker provides the API.
- Turso stores promises and check-ins.
- A random account key is hashed before it is used as the database owner ID.
- The Turso token stays in the Worker and is never shipped to the browser.

The account key can be copied from the profile card and reused on another device.

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
