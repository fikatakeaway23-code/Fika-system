# Web Deployment — Vercel

The React web app is deployed on [Vercel](https://vercel.com). It is a static Vite build with client-side routing.

---

## Prerequisites

- Vercel account
- Vercel CLI: `npm install -g vercel`
- Backend already deployed (you'll need the Railway URL)

---

## One-time Setup

### 1. Link project

```bash
cd web
vercel
# Follow prompts: link to your Vercel account, choose project name
```

### 2. Set environment variable

In Vercel dashboard → your project → **Settings** → **Environment Variables**:

| Variable        | Value                                           |
|-----------------|-------------------------------------------------|
| `VITE_API_URL`  | Your Railway backend URL (e.g. `https://fika-backend.up.railway.app`) |

Or create a Vercel secret and reference it (already configured in `vercel.json` as `@fika_api_url`):

```bash
vercel secrets add fika_api_url https://your-backend.up.railway.app
```

### 3. Deploy

```bash
vercel --prod
```

---

## Automatic Deploys (Recommended)

1. Push the repo to GitHub
2. In Vercel dashboard → **Import Project** → select your repo
3. Set **Root Directory** to `web`
4. Vercel auto-deploys on every push to `main`

---

## Build Settings (auto-detected from vercel.json)

| Setting          | Value         |
|------------------|---------------|
| Build Command    | `npm run build` |
| Output Directory | `dist`        |
| Framework Preset | Vite          |

---

## SPA Routing

`vercel.json` already includes a rewrite rule so all routes (e.g. `/staff`, `/menu`) serve `index.html`:

```json
"rewrites": [
  { "source": "/((?!api/.*).*)", "destination": "/index.html" }
]
```

---

## Verify

After deploy, check:
- `https://your-app.vercel.app` — landing page loads
- `https://your-app.vercel.app/menu` — menu page loads
- `https://your-app.vercel.app/staff/login` — login page loads
- Login with Owner PIN (0000) → dashboard appears with data from backend

---

## Custom Domain

1. Vercel dashboard → **Settings** → **Domains** → **Add**
2. Add CNAME/A record in your DNS registrar
3. Vercel provisions SSL automatically

---

## Preview Deployments

Every PR automatically gets a unique preview URL like `https://fika-web-git-branch.vercel.app`.
