# Backend Deployment — Railway

The backend is a Node.js + Express API with a PostgreSQL database, deployed on [Railway](https://railway.app).

---

## Prerequisites

- Railway account (free tier works for staging)
- Railway CLI: `npm install -g @railway/cli`
- PostgreSQL service provisioned on Railway

---

## One-time Setup

### 1. Create Railway project

```bash
railway login
railway init
# Choose "Empty project"
```

### 2. Add PostgreSQL service

In the Railway dashboard:
1. Click **+ New** → **Database** → **PostgreSQL**
2. Railway will automatically set `DATABASE_URL` in the environment

### 3. Link local repo

```bash
cd backend
railway link
```

### 4. Set environment variables

In Railway dashboard → your service → **Variables**, add:

| Variable              | Value                                        |
|-----------------------|----------------------------------------------|
| `DATABASE_URL`        | Auto-set by Railway PostgreSQL plugin        |
| `JWT_SECRET`          | A long random string (min 32 chars)          |
| `JWT_EXPIRY`          | `8h`                                         |
| `NOTION_TOKEN`        | Your Notion integration secret               |
| `NOTION_DB_SHIFTS`    | `f6352734d3df4702bafcad2e4566426d`           |
| `NOTION_DB_FINANCE`   | `c02e3a7f7f0649e9bcad12cc8cd8600a`           |
| `NOTION_DB_EXPENSES`  | `12a698558ed14ac790e652135f9ec6b2`           |
| `NOTION_DB_HR`        | `2f71a18986c84eacb5eac19fb0f63a63`           |
| `NOTION_DB_MEMBERS`   | `acce6ef958704ac289d3db5d17daee80`           |
| `CORS_ORIGIN`         | Your Vercel web URL (e.g. `https://fika.vercel.app`) |
| `NODE_ENV`            | `production`                                 |
| `PORT`                | `4000`                                       |

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 5. Deploy

```bash
railway up
```

Railway will detect the `Dockerfile` and build automatically.

---

## Database Migration & Seed

After first deploy, run migrations and seed:

```bash
# From your local machine (Railway proxies to the DB)
railway run npx prisma migrate deploy
railway run node prisma/seed.js
```

Or set the `startCommand` in `railway.toml` to include migrations:

```toml
[deploy]
startCommand = "npx prisma migrate deploy && node src/app.js"
```

---

## Verify Health

```bash
curl https://your-app.up.railway.app/api/health
# Expected: { "status": "ok", "timestamp": "..." }
```

---

## Re-deploys

Every `git push` to the linked branch triggers an automatic deploy.

To manually redeploy:
```bash
railway up
```

---

## Logs

```bash
railway logs
# or stream live:
railway logs --tail
```

---

## Rollback

Railway keeps the last 5 deployments. Roll back from the dashboard: **Deployments** → select previous → **Rollback**.

---

## Custom Domain

1. Railway dashboard → **Settings** → **Domains** → **Add Domain**
2. Add a CNAME record in your DNS pointing to the Railway URL
3. Update `CORS_ORIGIN` env var to your custom domain
