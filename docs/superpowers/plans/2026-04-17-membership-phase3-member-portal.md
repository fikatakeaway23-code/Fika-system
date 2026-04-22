# Membership Phase 3: Member Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Prerequisite:** Phase 1+2 plan must be complete — `DrinkRedemption`, `MemberAccount` models and `/api/member/auth/*` endpoints must exist before building this portal.

**Goal:** Build `member-portal/` — a standalone React + Vite web app where corporate clients log in and self-serve their Fika membership: check balance, browse drink history, view a monthly usage chart, request a top-up, and update their password.

**Architecture:** New `member-portal/` directory in the monorepo, same stack as `web/` (React 18 + Vite + Tailwind CSS + React Query v5). Uses the existing backend's `/api/member/*` endpoints added in Phase 1+2. Deployed as a second Vercel project pointing at `member-portal/` directory. Auth stored in `localStorage` (not sessionStorage — members are corporate admins on dedicated devices, longer sessions are fine). Completely isolated from the staff portal — no shared components or auth.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, React Query v5 (@tanstack/react-query), axios, recharts (bar chart for monthly usage)

---

## File Map

```
member-portal/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── vercel.json
└── src/
    ├── main.jsx                     — React entry, QueryClientProvider + RouterProvider
    ├── App.jsx                      — Route definitions
    ├── lib/
    │   ├── api.js                   — axios instance + memberApi object
    │   └── auth.js                  — getToken, setToken, clearToken, getAccount
    ├── pages/
    │   ├── LoginPage.jsx            — email + password form
    │   ├── DashboardPage.jsx        — balance gauge + mini stats
    │   ├── UsagePage.jsx            — paginated redemption table + month selector
    │   ├── ChartPage.jsx            — recharts bar chart: drinks by day
    │   ├── TopUpPage.jsx            — top-up request form
    │   └── ProfilePage.jsx          — company info + change password form
    └── components/
        ├── Layout.jsx               — sidebar + outlet (desktop) + bottom nav (mobile)
        ├── BalanceGauge.jsx         — reusable gauge bar + large number display
        └── ProtectedRoute.jsx       — redirects to /login if no token
```

### Backend — New Files (2 new endpoints needed for this portal)

The Phase 1+2 plan created `/api/member/auth/*` but the portal also needs data endpoints. Add these to the backend:

- `backend/src/controllers/memberData.controller.js` — getMemberDashboard, getMemberUsage, getMemberUsageChart, getMemberProfile, submitTopUp
- `backend/src/routes/memberData.routes.js` — GET /dashboard, GET /usage, GET /usage/chart, GET /profile, POST /topup

---

### Task 1: Backend data endpoints for the member portal

**Files:**
- Create: `backend/src/controllers/memberData.controller.js`
- Create: `backend/src/routes/memberData.routes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Create memberData controller**

Create `backend/src/controllers/memberData.controller.js`:

```javascript
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

export async function getMemberDashboard(req, res, next) {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.member.membershipId },
      select: {
        id:                   true,
        companyName:          true,
        tier:                 true,
        status:               true,
        drinksUsed:           true,
        drinksRemaining:      true,
        rolloverDrinks:       true,
        consecutiveRenewals:  true,
        loyaltyDiscountActive: true,
        monthlyFee:           true,
        renewalDate:          true,
        paymentStatus:        true,
      },
    });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const usedThisMonth = await prisma.drinkRedemption.aggregate({
      where:   { membershipId: membership.id, month, year },
      _sum:    { count: true },
    });

    // Average per working day (Mon–Fri only up to today)
    const startOfMonth = new Date(year, month - 1, 1);
    let workingDays = 0;
    for (let d = new Date(startOfMonth); d <= now; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0 && d.getDay() !== 6) workingDays++;
    }
    const totalUsed    = usedThisMonth._sum.count ?? 0;
    const avgPerDay    = workingDays > 0 ? +(totalUsed / workingDays).toFixed(1) : 0;

    res.json({
      membership,
      usedThisMonth: totalUsed,
      avgPerDay,
      workingDays,
    });
  } catch (err) {
    next(err);
  }
}

export async function getMemberUsage(req, res, next) {
  try {
    const querySchema = z.object({
      month:  z.coerce.number().int().min(1).max(12).optional(),
      year:   z.coerce.number().int().min(2020).optional(),
      page:   z.coerce.number().int().min(1).default(1),
    });
    const { month, year, page } = querySchema.parse(req.query);
    const limit  = 20;
    const offset = (page - 1) * limit;

    const where = { membershipId: req.member.membershipId };
    if (month !== undefined) where.month = month;
    if (year  !== undefined) where.year  = year;

    const [records, total] = await Promise.all([
      prisma.drinkRedemption.findMany({
        where,
        // Note: redeemedBy is the barista — show name so client can confirm who served them
        include: { redeemedBy: { select: { name: true } } },
        orderBy: { redeemedAt: 'desc' },
        take:    limit,
        skip:    offset,
      }),
      prisma.drinkRedemption.count({ where }),
    ]);

    res.json({ records, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

export async function getMemberUsageChart(req, res, next) {
  try {
    const now = new Date();
    const querySchema = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    });
    const { month, year } = querySchema.parse(req.query);

    const redemptions = await prisma.drinkRedemption.findMany({
      where:   { membershipId: req.member.membershipId, month, year },
      select:  { redeemedAt: true, count: true },
    });

    // Build a day-indexed array for the whole month
    const daysInMonth = new Date(year, month, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      day:    i + 1,
      drinks: 0,
    }));

    for (const r of redemptions) {
      const day = new Date(r.redeemedAt).getDate() - 1;
      data[day].drinks += r.count;
    }

    res.json({ month, year, data });
  } catch (err) {
    next(err);
  }
}

export async function getMemberProfile(req, res, next) {
  try {
    const account = await prisma.memberAccount.findUnique({
      where:   { id: req.member.accountId },
      include: {
        membership: {
          select: {
            companyName:         true,
            contactPerson:       true,
            whatsapp:            true,
            tier:                true,
            staffCount:          true,
            monthlyFee:          true,
            renewalDate:         true,
            joinedDate:          true,
            consecutiveRenewals: true,
            loyaltyDiscountActive: true,
            preferredTime:       true,
            usualOrder:          true,
          },
        },
      },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash, ...safe } = account;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

export async function submitTopUp(req, res, next) {
  try {
    const schema = z.object({
      message: z.string().max(500).optional(),
    });
    const { message } = schema.parse(req.body);

    const request = await prisma.topUpRequest.create({
      data: {
        membershipId: req.member.membershipId,
        message,
        status: 'pending',
      },
    });

    res.status(201).json({ request });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 2: Create memberData routes**

Create `backend/src/routes/memberData.routes.js`:

```javascript
import { Router } from 'express';
import {
  getMemberDashboard,
  getMemberUsage,
  getMemberUsageChart,
  getMemberProfile,
  submitTopUp,
} from '../controllers/memberData.controller.js';
import { authMember } from '../middleware/authMember.middleware.js';

const router = Router();
router.use(authMember); // all routes require member JWT

router.get('/dashboard',    getMemberDashboard);
router.get('/usage',        getMemberUsage);
router.get('/usage/chart',  getMemberUsageChart);
router.get('/profile',      getMemberProfile);
router.post('/topup',       submitTopUp);

export default router;
```

- [ ] **Step 3: Register in app.js**

Open `backend/src/app.js`. Add import:

```javascript
import memberDataRouter from './routes/memberData.routes.js';
```

Add registration alongside the memberAuthRouter line added in Phase 1:

```javascript
app.use('/api/member', memberDataRouter);
```

(Both `memberAuthRouter` and `memberDataRouter` mount on `/api/member` — Express merges them correctly since they use different sub-paths.)

- [ ] **Step 4: Test the new endpoints**

Get a member JWT first (using the account created in Phase 1 testing):

```bash
export MTOKEN=$(curl -s -X POST http://localhost:4000/api/member/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"corp@demo.com","password":"<TMPPASS>"}' | jq -r .token)
```

Test dashboard:
```bash
curl -s http://localhost:4000/api/member/dashboard \
  -H "Authorization: Bearer $MTOKEN" | jq '{company: .membership.companyName, remaining: .membership.drinksRemaining, usedThisMonth: .usedThisMonth}'
```

Expected: `{"company":"Kathmandu Corp","remaining":<number>,"usedThisMonth":<number>}`

Test chart:
```bash
curl -s "http://localhost:4000/api/member/usage/chart" \
  -H "Authorization: Bearer $MTOKEN" | jq '.data | length'
```

Expected: `30` (or 31 depending on month — number of days in current month)

- [ ] **Step 5: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/memberData.controller.js backend/src/routes/memberData.routes.js backend/src/app.js
git commit -m "feat: add member portal data endpoints (dashboard, usage, chart, profile, topup)"
```

---

### Task 2: Scaffold member-portal app

**Files:**
- Create: `member-portal/package.json`
- Create: `member-portal/vite.config.js`
- Create: `member-portal/tailwind.config.js`
- Create: `member-portal/postcss.config.js`
- Create: `member-portal/index.html`
- Create: `member-portal/vercel.json`

- [ ] **Step 1: Create package.json**

Create `member-portal/package.json`:

```json
{
  "name": "fika-member-portal",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev":   "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":                  "^18.3.1",
    "react-dom":              "^18.3.1",
    "react-router-dom":       "^6.23.1",
    "@tanstack/react-query":  "^5.40.0",
    "axios":                  "^1.7.2",
    "recharts":               "^2.12.7"
  },
  "devDependencies": {
    "@vitejs/plugin-react":   "^4.3.0",
    "autoprefixer":           "^10.4.19",
    "postcss":                "^8.4.38",
    "tailwindcss":            "^3.4.4",
    "vite":                   "^5.3.1"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

Create `member-portal/vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
```

- [ ] **Step 3: Create Tailwind config**

Create `member-portal/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:   '#1D9E75',
        secondary: '#2D6A4F',
      },
    },
  },
  plugins: [],
};
```

Create `member-portal/postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create index.html**

Create `member-portal/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Fika Member Portal</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☕</text></svg>" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create vercel.json**

Create `member-portal/vercel.json`:

```json
{
  "installCommand": "npm install --no-workspaces",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/((?!api/.*).*)", "destination": "/index.html" }
  ],
  "env": {
    "VITE_API_URL": "https://desirable-vision-production-b9ee.up.railway.app"
  }
}
```

- [ ] **Step 6: Install dependencies**

```bash
cd "x:/Fika system/member-portal"
npm install
```

Expected: `node_modules` created. No errors.

- [ ] **Step 7: Commit scaffold**

```bash
cd "x:/Fika system"
git add member-portal/
git commit -m "chore: scaffold member-portal app with Vite + React + Tailwind"
```

---

### Task 3: Auth utilities and API client

**Files:**
- Create: `member-portal/src/lib/auth.js`
- Create: `member-portal/src/lib/api.js`

- [ ] **Step 1: Create auth.js**

Create `member-portal/src/lib/auth.js`:

```javascript
const TOKEN_KEY   = 'fika_member_token';
const ACCOUNT_KEY = 'fika_member_account';

export function getToken()           { return localStorage.getItem(TOKEN_KEY); }
export function setToken(token)      { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken()         { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(ACCOUNT_KEY); }
export function getAccount()         { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)); } catch { return null; } }
export function setAccount(account)  { localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account)); }
export function isLoggedIn()         { return Boolean(getToken()); }
```

- [ ] **Step 2: Create api.js**

Create `member-portal/src/lib/api.js`:

```javascript
import axios from 'axios';
import { getToken, clearToken } from './auth.js';

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const memberApi = {
  login:          (email, password) => api.post('/member/auth/login', { email, password }),
  changePassword: (currentPassword, newPassword) =>
    api.patch('/member/auth/change-password', { currentPassword, newPassword }),

  getDashboard:   ()       => api.get('/member/dashboard'),
  getUsage:       (params) => api.get('/member/usage', { params }),
  getUsageChart:  (params) => api.get('/member/usage/chart', { params }),
  getProfile:     ()       => api.get('/member/profile'),
  submitTopUp:    (message)=> api.post('/member/topup', { message }),
};
```

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/lib/
git commit -m "feat: add member portal auth utilities and API client"
```

---

### Task 4: App entry point, router, layout

**Files:**
- Create: `member-portal/src/main.jsx`
- Create: `member-portal/src/index.css`
- Create: `member-portal/src/App.jsx`
- Create: `member-portal/src/components/ProtectedRoute.jsx`
- Create: `member-portal/src/components/Layout.jsx`

- [ ] **Step 1: Create index.css**

Create `member-portal/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
```

- [ ] **Step 2: Create main.jsx**

Create `member-portal/src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 3: Create ProtectedRoute.jsx**

Create `member-portal/src/components/ProtectedRoute.jsx`:

```jsx
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../lib/auth.js';

export function ProtectedRoute({ children }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
}
```

- [ ] **Step 4: Create App.jsx**

Create `member-portal/src/App.jsx`:

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { Layout }         from './components/Layout.jsx';
import { LoginPage }      from './pages/LoginPage.jsx';
import { DashboardPage }  from './pages/DashboardPage.jsx';
import { UsagePage }      from './pages/UsagePage.jsx';
import { ChartPage }      from './pages/ChartPage.jsx';
import { TopUpPage }      from './pages/TopUpPage.jsx';
import { ProfilePage }    from './pages/ProfilePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index          element={<DashboardPage />} />
        <Route path="usage"   element={<UsagePage />} />
        <Route path="chart"   element={<ChartPage />} />
        <Route path="topup"   element={<TopUpPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Create Layout.jsx**

Create `member-portal/src/components/Layout.jsx`:

```jsx
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken, getAccount } from '../lib/auth.js';

const NAV = [
  { to: '/',        label: 'Dashboard', end: true },
  { to: '/usage',   label: 'Usage log' },
  { to: '/chart',   label: 'Monthly chart' },
  { to: '/topup',   label: 'Top-up' },
  { to: '/profile', label: 'Profile' },
];

export function Layout() {
  const navigate = useNavigate();
  const account  = getAccount();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">F</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-widest leading-none">FIKA</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Member Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-700 truncate px-2 mb-1">{account?.membership?.companyName ?? 'Member'}</p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-red-500 font-semibold py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">F</span>
            </div>
            <span className="font-black text-primary tracking-widest text-sm">FIKA</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-red-500 font-semibold">Log out</button>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`
              }
            >
              {label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/
git commit -m "feat: add member portal entry point, router, layout, protected route"
```

---

### Task 5: LoginPage

**Files:**
- Create: `member-portal/src/pages/LoginPage.jsx`

- [ ] **Step 1: Create LoginPage.jsx**

Create `member-portal/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { memberApi } from '../lib/api.js';
import { setToken, setAccount } from '../lib/auth.js';

export function LoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await memberApi.login(email, password);
      setToken(res.data.token);
      setAccount(res.data.account);
      navigate(res.data.mustChangePassword ? '/profile' : '/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-sm p-8">
        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-widest">F</span>
          </div>
          <div>
            <p className="font-black text-primary text-base tracking-widest leading-none">FIKA</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Member Portal</p>
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your membership account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Need help? Contact Fika via WhatsApp.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and test login**

```bash
cd "x:/Fika system/member-portal"
npm run dev
```

Expected: `http://localhost:5174` (Vite picks next available port).

Open http://localhost:5174/login. Enter the email and temp password created during Phase 1 testing (e.g. `corp@demo.com` / `A3F9B2C1`).

Expected: Redirect to `/profile` (because `mustChangePassword: true`). The profile page will show an error (not built yet) — that's fine.

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/pages/LoginPage.jsx
git commit -m "feat: add member portal login page"
```

---

### Task 6: BalanceGauge component and DashboardPage

**Files:**
- Create: `member-portal/src/components/BalanceGauge.jsx`
- Create: `member-portal/src/pages/DashboardPage.jsx`

- [ ] **Step 1: Create BalanceGauge.jsx**

Create `member-portal/src/components/BalanceGauge.jsx`:

```jsx
export function BalanceGauge({ remaining, total, renewalDate, rolloverDrinks }) {
  const pct     = total > 0 ? Math.max(0, Math.min((remaining / total) * 100, 100)) : 0;
  const isLow   = pct < 20;

  const daysUntilRenewal = renewalDate
    ? Math.ceil((new Date(renewalDate) - new Date()) / 86400000)
    : null;

  return (
    <div className="text-center py-6">
      <p className={`text-5xl font-bold mb-1 ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
        {remaining}
        <span className="text-2xl text-gray-400 font-normal"> / {total}</span>
      </p>
      <p className="text-sm text-gray-500 mb-4">drinks remaining this month</p>

      <div className="h-3 rounded-full bg-gray-100 overflow-hidden mx-auto max-w-xs mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-2">
        {daysUntilRenewal !== null && (
          <span className={daysUntilRenewal <= 7 ? 'text-amber-600 font-semibold' : ''}>
            Renewal in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}
          </span>
        )}
        {rolloverDrinks > 0 && (
          <span className="text-primary">+{rolloverDrinks} rollover</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create DashboardPage.jsx**

Create `member-portal/src/pages/DashboardPage.jsx`:

```jsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { memberApi } from '../lib/api.js';
import { BalanceGauge } from '../components/BalanceGauge.jsx';

const TIER_LABELS = {
  daily_pass:    'Fika Pass',
  team_pack:     'Fika Plus',
  office_bundle: 'Fika Gold',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey:  ['member-dashboard'],
    queryFn:   () => memberApi.getDashboard().then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-500 text-sm p-4">Failed to load dashboard.</div>;
  }

  const { membership, usedThisMonth, avgPerDay } = data;
  const total = (membership.drinksRemaining ?? 0) + (membership.drinksUsed ?? 0);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{membership.companyName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">{TIER_LABELS[membership.tier] ?? membership.tier}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            membership.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>{membership.status}</span>
        </div>
      </div>

      {/* Balance gauge */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <BalanceGauge
          remaining={membership.drinksRemaining ?? 0}
          total={total}
          renewalDate={membership.renewalDate}
          rolloverDrinks={membership.rolloverDrinks}
        />
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Used this month', value: usedThisMonth },
          { label: 'Avg / working day', value: avgPerDay },
          { label: 'Consecutive renewals', value: membership.consecutiveRenewals },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Payment status */}
      {membership.paymentStatus !== 'paid' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
          Payment status: <span className="capitalize">{membership.paymentStatus}</span> — please contact Fika.
        </div>
      )}

      {/* Loyalty badge */}
      {membership.loyaltyDiscountActive && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary font-medium">
          Loyalty member — {membership.consecutiveRenewals} consecutive renewals
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/usage')}
          className="flex-1 border border-gray-200 text-sm font-medium text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          View usage log
        </button>
        <button
          onClick={() => navigate('/topup')}
          className="flex-1 bg-primary text-white text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Request top-up
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:5174 (must be logged in — if not, login at /login first).

Expected:
- Company name and tier label show at top
- Large drink balance number and gauge bar render
- 3 mini stat cards show (used this month, avg/day, consecutive renewals)
- Quick action buttons at bottom

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/components/BalanceGauge.jsx member-portal/src/pages/DashboardPage.jsx
git commit -m "feat: add BalanceGauge component and DashboardPage"
```

---

### Task 7: UsagePage, ChartPage

**Files:**
- Create: `member-portal/src/pages/UsagePage.jsx`
- Create: `member-portal/src/pages/ChartPage.jsx`

- [ ] **Step 1: Create UsagePage.jsx**

Create `member-portal/src/pages/UsagePage.jsx`:

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

export function UsagePage() {
  const now  = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [page,  setPage]  = useState(1);

  const { data, isLoading } = useQuery({
    queryKey:  ['member-usage', month, year, page],
    queryFn:   () => memberApi.getUsage({ month, year, page }).then(r => r.data),
    staleTime: 30_000,
  });

  // Generate last 12 month options for the selector
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      month: d.getMonth() + 1,
      year:  d.getFullYear(),
    });
  }

  function handleMonthChange(e) {
    const [m, y] = e.target.value.split('-').map(Number);
    setMonth(m);
    setYear(y);
    setPage(1);
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Usage log</h1>
        <select
          value={`${month}-${year}`}
          onChange={handleMonthChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-primary"
        >
          {monthOptions.map(o => (
            <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : !data?.records?.length ? (
          <p className="text-sm text-gray-400 text-center py-12">No redemptions in this period.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Drinks</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold hidden sm:table-cell">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.records.map(r => {
                  const dt = new Date(r.redeemedAt);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">
                        {dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.count}</td>
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{r.drinkType || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {data.pages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-xs font-medium text-gray-500 disabled:opacity-30 hover:text-gray-900"
                >
                  ← Previous
                </button>
                <span className="text-xs text-gray-400">Page {page} of {data.pages}</span>
                <button
                  onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="text-xs font-medium text-gray-500 disabled:opacity-30 hover:text-gray-900"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <p className="text-xs text-gray-400 text-center">
          {data.total} total redemption{data.total !== 1 ? 's' : ''} in this period
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ChartPage.jsx**

Create `member-portal/src/pages/ChartPage.jsx`:

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { memberApi } from '../lib/api.js';

export function ChartPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey:  ['member-chart', month, year],
    queryFn:   () => memberApi.getUsageChart({ month, year }).then(r => r.data),
    staleTime: 60_000,
  });

  const monthOptions = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      month: d.getMonth() + 1,
      year:  d.getFullYear(),
    });
  }

  function handleMonthChange(e) {
    const [m, y] = e.target.value.split('-').map(Number);
    setMonth(m);
    setYear(y);
  }

  const totalDrinks = data?.data?.reduce((sum, d) => sum + d.drinks, 0) ?? 0;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Monthly chart</h1>
        <select
          value={`${month}-${year}`}
          onChange={handleMonthChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-primary"
        >
          {monthOptions.map(o => (
            <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">Drinks per day</p>
              <p className="text-sm font-bold text-gray-900">{totalDrinks} total</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.data ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{ border: '0.5px solid #E5E7EB', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v) => [`${v} drink${v !== 1 ? 's' : ''}`, 'Used']}
                  labelFormatter={(day) => `Day ${day}`}
                />
                <Bar dataKey="drinks" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to http://localhost:5174/usage. Verify the table loads (may be empty if no redemptions in current month — change month selector to find data).

Navigate to http://localhost:5174/chart. Verify the bar chart renders without errors. If no data, bars are at 0 — that's correct.

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/pages/UsagePage.jsx member-portal/src/pages/ChartPage.jsx
git commit -m "feat: add UsagePage with pagination and ChartPage with recharts bar chart"
```

---

### Task 8: TopUpPage and ProfilePage

**Files:**
- Create: `member-portal/src/pages/TopUpPage.jsx`
- Create: `member-portal/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Create TopUpPage.jsx**

Create `member-portal/src/pages/TopUpPage.jsx`:

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

export function TopUpPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const { data: dashData } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn:  () => memberApi.getDashboard().then(r => r.data),
    staleTime: 60_000,
  });

  const remaining = dashData?.membership?.drinksRemaining ?? null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await memberApi.submitTopUp(message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Request sent!</h2>
        <p className="text-sm text-gray-500">Fika will contact you to process your top-up.</p>
        <button
          onClick={() => { setSent(false); setMessage(''); }}
          className="text-sm font-medium text-primary hover:underline"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Request a top-up</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {remaining !== null && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Current balance</p>
            <p className="text-2xl font-bold text-gray-900">{remaining} <span className="text-sm font-normal text-gray-400">drinks remaining</span></p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Message to Fika <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. We have a team event on Apr 20 and need 10 extra drinks"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending…' : 'Send request to Fika'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          Fika will reach out via WhatsApp to confirm.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProfilePage.jsx**

Create `member-portal/src/pages/ProfilePage.jsx`:

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

const TIER_LABELS = {
  daily_pass:    'Fika Pass',
  team_pack:     'Fika Plus',
  office_bundle: 'Fika Gold',
};

export function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwError,         setPwError]         = useState('');
  const [pwSuccess,       setPwSuccess]       = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn:  () => memberApi.getProfile().then(r => r.data),
    staleTime: 120_000,
  });

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await memberApi.changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  }

  const m = data?.membership;

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      {/* Company info */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company</p>
        <div className="space-y-3">
          {[
            { label: 'Company',        value: m?.companyName },
            { label: 'Contact person', value: m?.contactPerson },
            { label: 'WhatsApp',       value: m?.whatsapp },
            { label: 'Plan',           value: TIER_LABELS[m?.tier] ?? m?.tier },
            { label: 'Staff count',    value: m?.staffCount },
            { label: 'Monthly fee',    value: m?.monthlyFee != null ? `NPR ${Number(m.monthlyFee).toLocaleString()}` : undefined },
            { label: 'Member since',   value: m?.joinedDate ? new Date(m.joinedDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : undefined },
            { label: 'Renewal date',   value: m?.renewalDate ? new Date(m.renewalDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Change password</p>

        {pwSuccess ? (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            Password changed successfully.
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: 'Current password', value: currentPassword, onChange: setCurrentPassword, placeholder: '••••••••' },
              { label: 'New password',     value: newPassword,     onChange: setNewPassword,     placeholder: 'Min 8 characters' },
              { label: 'Confirm new',      value: confirmPassword, onChange: setConfirmPassword, placeholder: '••••••••' },
            ].map(({ label, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-red-600 font-medium">{pwError}</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm"
            >
              {pwLoading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify all pages in browser**

Navigate through each route in the member portal:
- http://localhost:5174/ → Dashboard loads with balance gauge
- http://localhost:5174/usage → Usage log table (may be empty, that's ok)
- http://localhost:5174/chart → Bar chart renders
- http://localhost:5174/topup → Top-up form with current balance shown
- http://localhost:5174/profile → Company info + change password form

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add member-portal/src/pages/TopUpPage.jsx member-portal/src/pages/ProfilePage.jsx
git commit -m "feat: add TopUpPage and ProfilePage to member portal"
```

---

### Task 9: Deploy member portal to Vercel

**Files:** No code changes

- [ ] **Step 1: Generate package-lock.json for Vercel**

```bash
cd "x:/Fika system/member-portal"
npm install
```

This creates/updates `member-portal/package-lock.json` which Vercel needs.

- [ ] **Step 2: Add member-portal to .gitignore exclusions**

Check `x:/Fika system/.gitignore`. Verify `member-portal/node_modules` is covered (if there's a root `node_modules/` entry it covers it; otherwise add `member-portal/node_modules/`).

- [ ] **Step 3: Push to git**

```bash
cd "x:/Fika system"
git add member-portal/package-lock.json
git push origin main
```

- [ ] **Step 4: Create new Vercel project**

Go to https://vercel.com/new. Import the same GitHub repository. Configure:
- **Root directory:** `member-portal`
- **Framework:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Install command:** `npm install --no-workspaces`

Add environment variable:
- `VITE_API_URL` = `https://desirable-vision-production-b9ee.up.railway.app`

Click Deploy.

- [ ] **Step 5: Verify production deployment**

Once deployed, open the Vercel URL. Navigate to `/login`. Log in with a member account.

Expected: Dashboard loads with real data from Railway backend.

---

## Self-Review

**Spec coverage check:**

| Requirement (from master plan) | Task |
|---|---|
| GET /member/dashboard — balance, renewal, payment status | Task 1 |
| GET /member/usage — paginated redemption history | Task 1 |
| GET /member/usage/chart — by-day data for recharts | Task 1 |
| GET /member/profile — company info + tier | Task 1 |
| POST /member/topup — creates TopUpRequest record | Task 1 |
| Separate React + Vite + Tailwind app in member-portal/ | Task 2 |
| Separate Vercel deployment | Task 9 |
| Login with email + password | Task 5 |
| Redirect to /profile if mustChangePassword | Task 5 |
| Balance gauge with large number + progress bar | Task 6 |
| Renewal countdown (amber ≤7 days) | Task 6 |
| Rollover drinks display | Task 6 |
| Mini stats (used this month, avg/day, consecutive renewals) | Task 6 |
| Payment status warning | Task 6 |
| Loyalty badge after 3 renewals | Task 6 |
| Paginated usage log with month/year selector | Task 7 |
| Bar chart: drinks by day with recharts | Task 7 |
| Top-up request form with success state | Task 8 |
| Profile: company info display | Task 8 |
| Change password form with validation | Task 8 |
| Sidebar nav (desktop) + bottom nav (mobile) | Task 4 |
| Auto-redirect to /login on 401 | Task 3 |

**No placeholders found.** All code is complete.

**Type consistency confirmed:** `memberApi.getDashboard()` → `GET /member/dashboard` → `getMemberDashboard` → returns `{ membership, usedThisMonth, avgPerDay }` — consistent across all layers. `BalanceGauge` props (`remaining`, `total`, `renewalDate`, `rolloverDrinks`) match what `DashboardPage` passes.

---

## Next Plans

- **Phase 4 plan:** `2026-04-17-membership-phase4-analytics.md` — Owner analytics dashboard: MRR, renewal calendar, barista leaderboard, overdue payment filter
- **Phase 5 plan:** `2026-04-17-membership-phase5-qr-whatsapp.md` — QR code generation, WhatsApp renewal reminders, monthly PDF summary
