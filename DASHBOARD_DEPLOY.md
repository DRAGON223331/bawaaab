# Tower Bot — Separate Vercel Dashboard

## Architecture
- Dashboard: Vercel / Next.js
- Bot + JSON database: Pella
- Dashboard talks to the bot through `BOT_API_URL` with `BOT_API_KEY`.
- Discord OAuth login is used for the dashboard.

## Vercel env
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `DASHBOARD_BASE_URL` = your Vercel URL
- `SESSION_SECRET` = long random secret
- `BOT_API_URL` = public HTTPS URL pointing to the bot API port on Pella
- `BOT_API_KEY` = same secret configured on Pella

Discord OAuth redirect URI:
`https://YOUR-VERCEL-DOMAIN/api/auth/callback`

## Pella env
- `DASHBOARD_API_KEY` = same value as `BOT_API_KEY`
- `DASHBOARD_API_PORT=3000`

Expose Pella port 3000 publicly over HTTPS. The website is NOT hosted on Pella; only the small authenticated API is.
