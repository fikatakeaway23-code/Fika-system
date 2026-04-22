# Membership Phase 1+2: Redemption Engine & Member Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the drink redemption audit trail, member authentication backend, and update the staff dashboard Memberships page with Log Drink modal, usage history panel, renewal alerts, and portal account creation — forming the foundation the entire membership ecosystem depends on.

**Architecture:** Extend Prisma schema with 3 new models (DrinkRedemption, MemberAccount, TopUpRequest) and add new fields to Membership. Add redemption + renewal endpoints to the existing membership controller. Add a separate member auth controller + middleware with its own JWT (same secret, different payload shape). Update the existing MembershipsPage.jsx to replace the raw +/- drink buttons with a full Log Drink modal backed by the new /redeem endpoint, plus new panels for usage history and portal account creation.

**Tech Stack:** Node.js/Express, Prisma 5, PostgreSQL (Railway), Zod, bcryptjs, jsonwebtoken, React 18 + React Query v5 + Tailwind CSS

---

## File Map

### Backend — New Files
- `backend/src/middleware/authMember.middleware.js` — validates member JWT, attaches `req.member`
- `backend/src/controllers/memberAuth.controller.js` — memberLogin, getMemberMe, changeMemberPassword, createMemberAccount, deleteMemberAccount
- `backend/src/routes/memberAuth.routes.js` — POST /auth/login, GET /auth/me, PATCH /auth/change-password, POST /:id/member-account, DELETE /:id/member-account

### Backend — Modified Files
- `backend/prisma/schema.prisma` — add DrinkRedemption, MemberAccount, TopUpRequest, TopUpStatus enum; extend Membership + User
- `backend/src/controllers/membership.controller.js` — add redeemDrink, getUsage, getUsageSummary, renewMembership (append to existing file)
- `backend/src/routes/membership.routes.js` — add /redeem, /usage, /usage/summary, /renew routes (keep existing routes intact)
- `backend/src/app.js` — register `/api/member` router

### Web — Modified Files
- `web/src/lib/api.js` — extend membershipApi with redeem, getUsage, getUsageSummary, renew, createAccount, deleteAccount
- `web/src/pages/staff/MembershipsPage.jsx` — add RedeemModal, UsagePanel, PortalAccountModal components; replace +/- buttons with Log Drink button; add renewal alert banners; add Portal Account button

---

### Task 1: Extend Prisma schema

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add DrinkRedemption model**

Open `backend/prisma/schema.prisma`. Append after the last existing model:

```prisma
model DrinkRedemption {
  id               String     @id @default(cuid())
  membershipId     String
  membership       Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  redeemedAt       DateTime   @default(now())
  count            Int        @default(1)
  redeemedByUserId String
  redeemedBy       User       @relation("BaristaRedemptions", fields: [redeemedByUserId], references: [id])
  notes            String?
  drinkType        String?
  month            Int
  year             Int

  @@map("drink_redemptions")
}

model MemberAccount {
  id                 String     @id @default(cuid())
  email              String     @unique
  passwordHash       String
  membershipId       String     @unique
  membership         Membership @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  lastLoginAt        DateTime?
  mustChangePassword Boolean    @default(true)
  qrToken            String     @unique @default(cuid())
  createdAt          DateTime   @default(now())

  @@map("member_accounts")
}

model TopUpRequest {
  id             String      @id @default(cuid())
  membershipId   String
  membership     Membership  @relation(fields: [membershipId], references: [id], onDelete: Cascade)
  requestedAt    DateTime    @default(now())
  message        String?
  status         TopUpStatus @default(pending)
  acknowledgedAt DateTime?

  @@map("topup_requests")
}

enum TopUpStatus {
  pending
  acknowledged
  fulfilled
}
```

- [ ] **Step 2: Add new fields and relations to existing Membership model**

Find the `Membership` model in the schema. Inside it, add the following fields (before the closing `}`):

```prisma
  rolloverDrinks        Int      @default(0)
  rolloverCap           Int      @default(5)
  consecutiveRenewals   Int      @default(0)
  loyaltyDiscountActive Boolean  @default(false)
  redemptions           DrinkRedemption[]
  memberAccount         MemberAccount?
  topUpRequests         TopUpRequest[]
```

- [ ] **Step 3: Add back-relation to existing User model**

Find the `User` model. Add this relation inside it:

```prisma
  drinkRedemptions  DrinkRedemption[] @relation("BaristaRedemptions")
```

- [ ] **Step 4: Push schema to database**

```bash
cd "x:/Fika system/backend"
npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 5: Verify new tables exist**

```bash
npx prisma studio
```

Open http://localhost:5555 in browser. Confirm `drink_redemptions`, `member_accounts`, `topup_requests` tables appear in left sidebar. Close Prisma Studio (Ctrl+C).

- [ ] **Step 6: Commit**

```bash
cd "x:/Fika system"
git add backend/prisma/schema.prisma
git commit -m "feat: add DrinkRedemption, MemberAccount, TopUpRequest models to schema"
```

---

### Task 2: Redemption controller functions

**Files:**
- Modify: `backend/src/controllers/membership.controller.js`

- [ ] **Step 1: Add tier constants above the existing functions**

Open `backend/src/controllers/membership.controller.js`. Find the top of the file (after imports). Add these constants immediately after the imports block:

```javascript
const TIER_ROLLOVER_CAPS = {
  daily_pass: 5,
  team_pack: 8,
  office_bundle: 10,
};
```

- [ ] **Step 2: Append redeemDrink function**

At the very end of `backend/src/controllers/membership.controller.js`, append:

```javascript
export async function redeemDrink(req, res, next) {
  try {
    const { id } = req.params;
    const redeemSchema = z.object({
      count:     z.number().int().min(1).max(10).default(1),
      notes:     z.string().optional(),
      drinkType: z.string().optional(),
    });
    const { count, notes, drinkType } = redeemSchema.parse(req.body);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    if (membership.status !== 'active') {
      return res.status(400).json({ error: 'Membership is not active' });
    }
    if (membership.drinksRemaining !== null && membership.drinksRemaining < count) {
      return res.status(400).json({
        error: 'Insufficient balance',
        drinksRemaining: membership.drinksRemaining,
      });
    }

    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [redemption, updated] = await prisma.$transaction([
      prisma.drinkRedemption.create({
        data: {
          membershipId:     id,
          count,
          notes,
          drinkType,
          redeemedByUserId: req.user.id,
          month,
          year,
        },
      }),
      prisma.membership.update({
        where: { id },
        data: {
          drinksUsed: { increment: count },
          ...(membership.drinksRemaining !== null && {
            drinksRemaining: { decrement: count },
          }),
        },
      }),
    ]);

    res.json({ redemption, membership: updated });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Append getUsage function**

```javascript
export async function getUsage(req, res, next) {
  try {
    const { id } = req.params;
    const querySchema = z.object({
      month:  z.coerce.number().int().min(1).max(12).optional(),
      year:   z.coerce.number().int().min(2020).optional(),
      limit:  z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    });
    const { month, year, limit, offset } = querySchema.parse(req.query);

    const where = { membershipId: id };
    if (month !== undefined) where.month = month;
    if (year  !== undefined) where.year  = year;

    const [records, total] = await Promise.all([
      prisma.drinkRedemption.findMany({
        where,
        include: { redeemedBy: { select: { name: true } } },
        orderBy: { redeemedAt: 'desc' },
        take:    limit,
        skip:    offset,
      }),
      prisma.drinkRedemption.count({ where }),
    ]);

    res.json({ records, total, limit, offset });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 4: Append getUsageSummary function**

```javascript
export async function getUsageSummary(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();
    const querySchema = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    });
    const { month, year } = querySchema.parse(req.query);

    const redemptions = await prisma.drinkRedemption.findMany({
      where:   { membershipId: id, month, year },
      include: { redeemedBy: { select: { id: true, name: true } } },
    });

    const totalDrinks = redemptions.reduce((sum, r) => sum + r.count, 0);

    const byDay = {};
    for (const r of redemptions) {
      const day = new Date(r.redeemedAt).getDate();
      byDay[day] = (byDay[day] || 0) + r.count;
    }

    const byBarista = {};
    for (const r of redemptions) {
      const name = r.redeemedBy.name;
      byBarista[name] = (byBarista[name] || 0) + r.count;
    }

    res.json({ month, year, totalDrinks, byDay, byBarista });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 5: Append renewMembership function**

```javascript
export async function renewMembership(req, res, next) {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    // Determine the base drink limit for this tier
    const TIER_DRINK_LIMITS = { daily_pass: null, team_pack: 30, office_bundle: null };
    const drinkLimit = membership.drinksPerDay ?? TIER_DRINK_LIMITS[membership.tier];

    const rolloverCap = membership.rolloverCap ?? TIER_ROLLOVER_CAPS[membership.tier] ?? 5;
    const rolloverEarned =
      membership.drinksRemaining !== null
        ? Math.min(membership.drinksRemaining, rolloverCap)
        : 0;

    const newDrinksRemaining =
      drinkLimit !== null ? drinkLimit + rolloverEarned : null;
    const newConsecutive = membership.consecutiveRenewals + 1;

    const updated = await prisma.membership.update({
      where: { id },
      data: {
        drinksUsed:           0,
        drinksRemaining:      newDrinksRemaining,
        rolloverDrinks:       rolloverEarned,
        consecutiveRenewals:  newConsecutive,
        loyaltyDiscountActive: newConsecutive >= 3,
        monthsActive:         { increment: 1 },
        totalRevenue:         { increment: membership.monthlyFee },
      },
    });

    res.json({ membership: updated, rolloverEarned, newConsecutive });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 6: Commit**

```bash
cd "x:/Fika system"
git add backend/src/controllers/membership.controller.js
git commit -m "feat: add redeemDrink, getUsage, getUsageSummary, renewMembership to membership controller"
```

---

### Task 3: Member auth middleware and controller

**Files:**
- Create: `backend/src/middleware/authMember.middleware.js`
- Create: `backend/src/controllers/memberAuth.controller.js`

- [ ] **Step 1: Create authMember middleware**

Create `backend/src/middleware/authMember.middleware.js` with this content:

```javascript
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export function authMember(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Member authentication required' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, SECRET);
    // Member tokens carry accountId + membershipId (not id + role like staff tokens)
    if (!payload.accountId) {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    req.member = { accountId: payload.accountId, membershipId: payload.membershipId };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired member token' });
  }
}
```

- [ ] **Step 2: Create memberAuth controller**

Create `backend/src/controllers/memberAuth.controller.js` with this content:

```javascript
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import crypto from 'crypto';

const SECRET = process.env.JWT_SECRET;

export async function memberLogin(req, res, next) {
  try {
    const schema = z.object({
      email:    z.string().email(),
      password: z.string().min(1),
    });
    const { email, password } = schema.parse(req.body);

    const account = await prisma.memberAccount.findUnique({
      where:   { email },
      include: { membership: true },
    });

    if (!account) return res.status(401).json({ error: 'Invalid credentials' });
    if (account.membership.status !== 'active') {
      return res.status(403).json({ error: 'Membership is not active' });
    }

    const valid = await bcrypt.compare(password, account.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await prisma.memberAccount.update({
      where: { id: account.id },
      data:  { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { accountId: account.id, membershipId: account.membershipId },
      SECRET,
      { expiresIn: '24h' }
    );

    const { passwordHash, ...accountSafe } = account;
    res.json({ token, mustChangePassword: account.mustChangePassword, account: accountSafe });
  } catch (err) {
    next(err);
  }
}

export async function getMemberMe(req, res, next) {
  try {
    const account = await prisma.memberAccount.findUnique({
      where:   { id: req.member.accountId },
      include: { membership: true },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const { passwordHash, ...safe } = account;
    res.json(safe);
  } catch (err) {
    next(err);
  }
}

export async function changeMemberPassword(req, res, next) {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);

    const account = await prisma.memberAccount.findUnique({
      where: { id: req.member.accountId },
    });
    const valid = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.memberAccount.update({
      where: { id: account.id },
      data:  { passwordHash, mustChangePassword: false },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function createMemberAccount(req, res, next) {
  try {
    const { id } = req.params; // membershipId
    const schema = z.object({ email: z.string().email() });
    const { email } = schema.parse(req.body);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const existing = await prisma.memberAccount.findUnique({ where: { membershipId: id } });
    if (existing) {
      return res.status(409).json({ error: 'Portal account already exists for this membership' });
    }

    // 8-char uppercase hex temp password — easy to read aloud
    const tempPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const account = await prisma.memberAccount.create({
      data: { email, passwordHash, membershipId: id },
    });

    res.status(201).json({
      account:      { id: account.id, email: account.email },
      tempPassword, // shown once — owner shares with client
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteMemberAccount(req, res, next) {
  try {
    const { id } = req.params; // membershipId
    const account = await prisma.memberAccount.findUnique({ where: { membershipId: id } });
    if (!account) return res.status(404).json({ error: 'No portal account for this membership' });
    await prisma.memberAccount.delete({ where: { membershipId: id } });
    res.json({ message: 'Portal access revoked' });
  } catch (err) {
    next(err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd "x:/Fika system"
git add backend/src/middleware/authMember.middleware.js backend/src/controllers/memberAuth.controller.js
git commit -m "feat: add member auth middleware and controller"
```

---

### Task 4: Update routes and register in app.js

**Files:**
- Create: `backend/src/routes/memberAuth.routes.js`
- Modify: `backend/src/routes/membership.routes.js`
- Modify: `backend/src/app.js`

- [ ] **Step 1: Create memberAuth.routes.js**

Create `backend/src/routes/memberAuth.routes.js`:

```javascript
import { Router } from 'express';
import {
  memberLogin,
  getMemberMe,
  changeMemberPassword,
} from '../controllers/memberAuth.controller.js';
import { authMember } from '../middleware/authMember.middleware.js';

const router = Router();

router.post('/auth/login',           memberLogin);
router.get('/auth/me',   authMember, getMemberMe);
router.patch('/auth/change-password', authMember, changeMemberPassword);

export default router;
```

- [ ] **Step 2: Add new routes to membership.routes.js**

The existing `membership.routes.js` has `router.use(authenticate, requireOwner)` at line 13, which wraps ALL routes. The `/redeem` route needs to allow baristas too. Replace the entire file content with:

```javascript
import { Router } from 'express';
import {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
  incrementDrinks,
  redeemDrink,
  getUsage,
  getUsageSummary,
  renewMembership,
} from '../controllers/membership.controller.js';
import {
  createMemberAccount,
  deleteMemberAccount,
} from '../controllers/memberAuth.controller.js';
import { authenticate, requireOwner } from '../middleware/auth.middleware.js';

const router = Router();

// Owner-only routes
router.post('/',    authenticate, requireOwner, createMembership);
router.get('/',     authenticate, requireOwner, getMemberships);
router.get('/:id',  authenticate, requireOwner, getMembershipById);
router.put('/:id',  authenticate, requireOwner, updateMembership);
router.delete('/:id', authenticate, requireOwner, deleteMembership);

// Legacy increment (keep for backwards compat — deprecated)
router.post('/:id/drinks',  authenticate, requireOwner, incrementDrinks);

// New: any authenticated staff can redeem (barista or owner)
router.post('/:id/redeem',         authenticate, redeemDrink);

// Owner-only: usage reports and management
router.get('/:id/usage',           authenticate, requireOwner, getUsage);
router.get('/:id/usage/summary',   authenticate, requireOwner, getUsageSummary);
router.post('/:id/renew',          authenticate, requireOwner, renewMembership);
router.post('/:id/member-account', authenticate, requireOwner, createMemberAccount);
router.delete('/:id/member-account', authenticate, requireOwner, deleteMemberAccount);

export default router;
```

- [ ] **Step 3: Register /api/member in app.js**

Open `backend/src/app.js`. Find where existing routes are registered (the block of `app.use('/api/...')` calls). Add this import at the top with the other route imports:

```javascript
import memberAuthRouter from './routes/memberAuth.routes.js';
```

Then add this registration in the routes block:

```javascript
app.use('/api/member', memberAuthRouter);
```

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add backend/src/routes/memberAuth.routes.js backend/src/routes/membership.routes.js backend/src/app.js
git commit -m "feat: register member auth and redemption routes"
```

---

### Task 5: Verify backend with curl

**Files:** No code changes — verification only

- [ ] **Step 1: Start backend**

```bash
cd "x:/Fika system/backend" && npm run dev
```

Expected: `Server running on port 4000` (or similar). Leave running.

- [ ] **Step 2: Get owner JWT**

In a new terminal:
```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role":"owner","pin":"0000"}' | jq .token
```

Expected: A long JWT string. Export it: `export TOKEN="<the token>"`

- [ ] **Step 3: Get membership ID from seeded data**

```bash
curl -s http://localhost:4000/api/memberships \
  -H "Authorization: Bearer $TOKEN" | jq '.[0].id'
```

Expected: A cuid string like `"clxyz..."`. Export: `export MID="<id>"`

- [ ] **Step 4: Test redeem endpoint**

```bash
curl -s -X POST "http://localhost:4000/api/memberships/$MID/redeem" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count":1,"drinkType":"Americano","notes":"curl test"}' | jq .redemption.id
```

Expected: A cuid string (the redemption record ID).

- [ ] **Step 5: Test usage endpoint**

```bash
curl -s "http://localhost:4000/api/memberships/$MID/usage" \
  -H "Authorization: Bearer $TOKEN" | jq '.total'
```

Expected: `1` (the redemption logged in step 4).

- [ ] **Step 6: Test createMemberAccount endpoint**

```bash
curl -s -X POST "http://localhost:4000/api/memberships/$MID/member-account" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"corp@test.com"}' | jq .
```

Expected:
```json
{
  "account": { "id": "...", "email": "corp@test.com" },
  "tempPassword": "A3F9B2C1"
}
```
Export: `export TMPPASS="<tempPassword value>"`

- [ ] **Step 7: Test member login**

```bash
curl -s -X POST http://localhost:4000/api/member/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"corp@test.com\",\"password\":\"$TMPPASS\"}" | jq '{token: .token, mustChange: .mustChangePassword}'
```

Expected:
```json
{ "token": "eyJ...", "mustChange": true }
```

- [ ] **Step 8: Test renew endpoint**

```bash
curl -s -X POST "http://localhost:4000/api/memberships/$MID/renew" \
  -H "Authorization: Bearer $TOKEN" | jq '{rolloverEarned: .rolloverEarned, consecutive: .newConsecutive}'
```

Expected: `{"rolloverEarned": 0, "consecutive": 1}` (no drinks left to roll over since it was just seeded).

All 7 endpoints confirmed working. Move to frontend.

---

### Task 6: Extend membershipApi in api.js

**Files:**
- Modify: `web/src/lib/api.js`

- [ ] **Step 1: Replace the membershipApi object**

In `web/src/lib/api.js`, find the existing `membershipApi` object (lines 62-68). Replace it entirely with:

```javascript
export const membershipApi = {
  getAll:          (params)   => api.get('/memberships',                    { params }),
  getById:         (id)       => api.get(`/memberships/${id}`),
  create:          (data)     => api.post('/memberships', data),
  update:          (id, data) => api.put(`/memberships/${id}`, data),
  addDrink:        (id, delta)=> api.post(`/memberships/${id}/drinks`, { delta }), // legacy
  redeem:          (id, data) => api.post(`/memberships/${id}/redeem`, data),
  getUsage:        (id, params) => api.get(`/memberships/${id}/usage`,         { params }),
  getUsageSummary: (id, params) => api.get(`/memberships/${id}/usage/summary`,  { params }),
  renew:           (id)       => api.post(`/memberships/${id}/renew`),
  createAccount:   (id, email)=> api.post(`/memberships/${id}/member-account`, { email }),
  deleteAccount:   (id)       => api.delete(`/memberships/${id}/member-account`),
};
```

- [ ] **Step 2: Commit**

```bash
cd "x:/Fika system"
git add web/src/lib/api.js
git commit -m "feat: extend membershipApi with redeem, usage, renew, account management methods"
```

---

### Task 7: MembershipsPage — RedeemModal and UsagePanel

**Files:**
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Add RedeemModal component**

Open `web/src/pages/staff/MembershipsPage.jsx`. After the existing `DrinkBar` function (line 35), insert the following two components:

```jsx
function RedeemModal({ membership, onClose, onSuccess }) {
  const [count, setCount]       = useState(1);
  const [drinkType, setDrinkType] = useState('');
  const [notes, setNotes]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const remaining = membership.drinksRemaining;
  const afterRedeem = remaining !== null ? remaining - count : null;

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      await membershipApi.redeem(membership.id, {
        count,
        drinkType: drinkType.trim() || undefined,
        notes:     notes.trim()     || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log drink');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Log drink redemption</h3>
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Company</p>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">{membership.companyName}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Count</label>
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} drink{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Drink type <span className="text-gray-400">(optional)</span></label>
            <input
              value={drinkType}
              onChange={e => setDrinkType(e.target.value)}
              placeholder="e.g. Americano, Latte, Tea"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Note <span className="text-gray-400">(optional)</span></label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. team meeting"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          {remaining !== null && (
            <p className="text-xs text-gray-500">
              Balance after:{' '}
              <span className={`font-semibold ${afterRedeem < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {afterRedeem} drink{afterRedeem !== 1 ? 's' : ''} remaining
              </span>
            </p>
          )}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || (remaining !== null && count > remaining)}
            className="flex-1 bg-secondary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging…' : 'Confirm'}
          </button>
          <button
            onClick={onClose}
            className="px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add UsagePanel component**

After `RedeemModal`, insert:

```jsx
function UsagePanel({ membershipId, onClose }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    membershipApi.getUsage(membershipId, { limit: 30 })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [membershipId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Usage history</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
        ) : !data?.records?.length ? (
          <p className="text-sm text-gray-500 text-center py-12">No redemptions recorded yet.</p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Date & time</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Drinks</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">By</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-900 text-xs">
                      {new Date(r.redeemedAt).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">{r.count}</td>
                    <td className="py-2.5 text-gray-500">{r.drinkType || '—'}</td>
                    <td className="py-2.5 text-gray-500">{r.redeemedBy?.name || '—'}</td>
                    <td className="py-2.5 text-gray-400 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add PortalAccountModal component**

After `UsagePanel`, insert:

```jsx
function PortalAccountModal({ membership, onClose }) {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  async function handleCreate() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await membershipApi.createAccount(membership.id, email.trim());
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Portal account</h3>
        <p className="text-xs text-gray-500 mb-4">{membership.companyName}</p>
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl px-4 py-4 border border-green-100">
              <p className="text-xs font-bold text-green-800 mb-3 uppercase tracking-wide">Account created</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{result.account.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Temp password <span className="text-gray-400">(shown once)</span></p>
                  <p className="text-lg font-mono font-bold text-gray-900 tracking-widest">{result.tempPassword}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Share with client via WhatsApp. They must change it on first login.</p>
            </div>
            <button onClick={onClose} className="w-full text-sm font-semibold text-gray-700 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
              />
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={loading || !email.trim()}
                className="flex-1 bg-secondary text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 hover:bg-secondary/90"
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
              <button onClick={onClose} className="px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: add RedeemModal, UsagePanel, PortalAccountModal components to MembershipsPage"
```

---

### Task 8: Wire modals into MembershipsPage state and UI

**Files:**
- Modify: `web/src/pages/staff/MembershipsPage.jsx`

- [ ] **Step 1: Add renewal helper function and modal state**

In `MembershipsPage` function body, after the existing `const selMem = ...` line (currently line 74), add:

```javascript
const [redeemTarget, setRedeemTarget] = useState(null); // membership object
const [usageTarget,  setUsageTarget]  = useState(null); // membership id
const [portalTarget, setPortalTarget] = useState(null); // membership object

function daysUntilRenewal(renewalDate) {
  if (!renewalDate) return null;
  const diff = new Date(renewalDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
```

- [ ] **Step 2: Replace the +/- drink buttons in the detail panel with Log Drink button**

Find the existing `{/* +/- buttons */}` section (currently lines 176-179):

```jsx
{/* +/- buttons */}
<div className="flex gap-2">
  <button onClick={() => addDrink({ id: selMem.id, delta: -1 })} disabled={(selMem.drinksUsed ?? 0) <= 0} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 disabled:opacity-30">− Drink</button>
  <button onClick={() => addDrink({ id: selMem.id, delta: 1 })} className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark">+ Drink</button>
</div>
```

Replace it with:

```jsx
{/* Action buttons */}
<div className="flex gap-2">
  <button
    onClick={() => setRedeemTarget(selMem)}
    className="flex-1 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-secondary/90 transition-colors"
  >
    Log drink
  </button>
  <button
    onClick={() => setUsageTarget(selMem.id)}
    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
  >
    Usage
  </button>
  <button
    onClick={() => setPortalTarget(selMem)}
    className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
  >
    Portal
  </button>
</div>
```

- [ ] **Step 3: Add renewal alert banner to the detail panel**

Find the start of the detail panel section (the `{selMem ? (` block). After the opening `<div className="bg-white rounded-2xl ...">` and before the `<div className="flex items-start justify-between">` (company name row), insert:

```jsx
{(() => {
  const days = daysUntilRenewal(selMem.renewalDate);
  if (days !== null && days <= 7 && days >= 0) {
    return (
      <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
        days <= 3
          ? 'bg-red-50 text-red-700 border border-red-100'
          : 'bg-amber-50 text-amber-700 border border-amber-100'
      }`}>
        Renewal in {days} day{days !== 1 ? 's' : ''} · NPR {Number(selMem.monthlyFee).toLocaleString()}/mo
      </div>
    );
  }
  return null;
})()}
```

- [ ] **Step 4: Update drinksRemaining display in the detail panel**

Find the existing drinks usage section (lines 165-173) that reads from `selMem.drinksUsed` and `ALLOTMENT[selMem.tier]`. Replace it with a version that also shows `drinksRemaining` from the API (now populated from backend):

```jsx
{/* Drinks usage */}
<div>
  <div className="flex justify-between text-sm mb-1">
    <span className="text-muted">Drinks used</span>
    <span className="font-bold text-gray-900">
      {selMem.drinksUsed ?? 0}
      {selMem.drinksRemaining !== null && ` / ${(selMem.drinksUsed ?? 0) + selMem.drinksRemaining}`}
    </span>
  </div>
  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-primary rounded-full transition-all"
      style={{
        width: selMem.drinksRemaining !== null
          ? `${Math.min(((selMem.drinksUsed ?? 0) / ((selMem.drinksUsed ?? 0) + selMem.drinksRemaining)) * 100, 100)}%`
          : `${Math.min(((selMem.drinksUsed ?? 0) / (ALLOTMENT[selMem.tier] ?? 1)) * 100, 100)}%`,
      }}
    />
  </div>
  {selMem.drinksRemaining !== null && (
    <p className="text-xs text-muted mt-1">{selMem.drinksRemaining} remaining</p>
  )}
</div>
```

- [ ] **Step 5: Render modals at the root of the returned JSX**

Find the closing `</div>` of the entire page `return (...)` block. Before it, add the modal renders:

```jsx
      {/* Modals */}
      {redeemTarget && (
        <RedeemModal
          membership={redeemTarget}
          onClose={() => setRedeemTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['memberships-web'] })}
        />
      )}
      {usageTarget && (
        <UsagePanel
          membershipId={usageTarget}
          onClose={() => setUsageTarget(null)}
        />
      )}
      {portalTarget && (
        <PortalAccountModal
          membership={portalTarget}
          onClose={() => setPortalTarget(null)}
        />
      )}
```

- [ ] **Step 6: Commit**

```bash
cd "x:/Fika system"
git add web/src/pages/staff/MembershipsPage.jsx
git commit -m "feat: wire Log Drink, Usage, Portal Account modals into MembershipsPage"
```

---

### Task 9: Browser verification

**Files:** No code changes — verification only

- [ ] **Step 1: Start both servers**

Terminal 1: `cd "x:/Fika system/backend" && npm run dev`
Terminal 2: `cd "x:/Fika system/web" && npm run dev`

- [ ] **Step 2: Log in as owner**

Open http://localhost:5173/staff/login. Select Owner, enter PIN `0000`.

- [ ] **Step 3: Open Memberships page**

Click Memberships in sidebar. Verify the table loads with the seeded Kathmandu Corp entry.

- [ ] **Step 4: Test Log Drink**

Click the Kathmandu Corp row to open the detail panel. Verify the panel shows "Log drink", "Usage", and "Portal" buttons (replacing the old +/- buttons).

Click "Log drink". Modal opens. Select 2 drinks, type "Cappuccino", click Confirm. 
Expected: Modal closes. Detail panel refreshes and shows updated `drinksUsed`.

- [ ] **Step 5: Test Usage panel**

Click "Usage" in the detail panel.
Expected: Panel opens showing the 2-drink Cappuccino redemption just logged.

- [ ] **Step 6: Test Portal Account creation**

Click "Portal" in the detail panel. Enter email `corp@demo.com`. Click "Create account".
Expected: Success screen shows temp password (8 uppercase hex chars like `A3F9B2C1`).

- [ ] **Step 7: Verify member login works**

In a separate terminal, test member login with the temp password shown in step 6:

```bash
curl -s -X POST http://localhost:4000/api/member/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"corp@demo.com","password":"<TMPPASS>"}' | jq '.mustChangePassword'
```

Expected: `true`

---

### Task 10: Deploy to production

**Files:** No code changes

- [ ] **Step 1: Push backend changes to Railway**

```bash
cd "x:/Fika system"
git push origin main
```

Railway auto-deploys from main. Wait ~2 minutes.

- [ ] **Step 2: Run db push on Railway**

In the Railway dashboard → backend service → Shell (or via Railway CLI):

```bash
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify backend health**

```bash
curl https://desirable-vision-production-b9ee.up.railway.app/api/health
```

Expected: `{"status":"ok"}`

- [ ] **Step 4: Vercel will auto-deploy web changes**

Check Vercel dashboard for the `web` project. Deployment should complete within 2 minutes of the git push.

- [ ] **Step 5: Smoke test production**

Open https://web-five-lovat-45.vercel.app/staff/login. Log in as owner (PIN 0000). Navigate to Memberships. Verify "Log drink", "Usage", "Portal" buttons appear in the detail panel.

---

## Self-Review

**Spec coverage check:**

| Requirement | Task |
|---|---|
| DrinkRedemption model with timestamp, barista FK, count, drinkType | Task 1 |
| MemberAccount model with email, passwordHash, membershipId | Task 1 |
| TopUpRequest model | Task 1 |
| Membership extensions (rolloverDrinks, rolloverCap, consecutiveRenewals, loyaltyDiscountActive) | Task 1 |
| POST /redeem endpoint — atomic transaction, decrement balance | Task 2 |
| GET /usage endpoint with month/year filtering | Task 2 |
| GET /usage/summary with byDay + byBarista aggregation | Task 2 |
| POST /renew with rollover logic + loyalty streak | Task 2 |
| authMember middleware — separate from staff auth | Task 3 |
| Member login with email + password — 24h JWT | Task 3 |
| GET /auth/me for member portal | Task 3 |
| PATCH /auth/change-password with mustChangePassword=false | Task 3 |
| POST /member-account — creates account, returns temp password | Task 3 |
| DELETE /member-account — revokes access | Task 3 |
| /redeem accessible to baristas (not owner-only) | Task 4 |
| membershipApi extended with new methods | Task 6 |
| RedeemModal with count, drinkType, notes, balance preview | Task 7 |
| UsagePanel showing paginated redemption log | Task 7 |
| PortalAccountModal with success screen showing temp password | Task 7 |
| Log Drink + Usage + Portal buttons in detail panel | Task 8 |
| Renewal alert banner (amber ≤7 days, red ≤3 days) | Task 8 |
| drinksRemaining shown in detail panel | Task 8 |

**No placeholders found.** All steps contain complete code.

**Type consistency confirmed:** `membershipApi.redeem` → `POST /memberships/:id/redeem` → `redeemDrink` → `prisma.drinkRedemption.create` — consistent field names throughout.

---

## Next Plans

This plan covers Phase 1 + 2 of the master plan. The remaining phases are:

- **Phase 3 plan:** `2026-04-17-membership-phase3-member-portal.md` — Scaffold `member-portal/` React + Vite app with login, dashboard, usage log, top-up request, monthly chart, profile pages
- **Phase 4 plan:** Analytics — owner dashboard MRR, renewal calendar, barista leaderboard
- **Phase 5 plan:** QR codes + WhatsApp automations
