# Daymark

A private, iPhone-ready daily check-in app. Create a promise such as “Drink one
cup of water”, mark it complete once per local day, and follow your streak.

**Live app:** https://daymark-daily.alfed-v-bergstrand.chatgpt.site

## Features

- ChatGPT sign-in with server-side owner checks
- Turso-hosted SQL storage through Drizzle ORM
- one check-in per promise and calendar day
- seven-day rhythm, streaks, and safe archiving
- installable PWA with Apple touch icons and offline fallback
- responsive purple No-Comment login experience

## Local setup

Requirements: Node.js 22.13 or newer and a Turso database.

```powershell
Copy-Item .env.example .env
npm.cmd install
npm.cmd run db:migrate
npm.cmd run dev
```

Set `TURSO_DATABASE_URL` and a database-scoped `TURSO_AUTH_TOKEN` in `.env`.
Never commit that file.

## Verification

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd audit --omit=dev --audit-level=high
```

GitHub stores the source and history. The running full-stack app is deployed
through OpenAI Sites because GitHub Pages cannot run its authenticated API
routes.
