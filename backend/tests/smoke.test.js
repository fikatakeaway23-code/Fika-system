import test, { after, afterEach, before } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { default: app } = await import('../src/app.js');
const { prisma } = await import('../src/lib/prisma.js');

let server;
let baseUrl;
const restores = [];

function stubMethod(target, key, replacement) {
  const original = target[key];
  target[key] = replacement;
  restores.push(() => {
    target[key] = original;
  });
}

function signStaffToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function signMemberToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function headers(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

afterEach(() => {
  while (restores.length > 0) {
    restores.pop()();
  }
});

test('owner can reset another user PIN without currentPin', async () => {
  stubMethod(prisma.user, 'findUnique', async () => ({ id: 'barista-1', pinHash: 'ignored' }));
  stubMethod(prisma.user, 'update', async ({ where, data }) => ({ id: where.id, ...data }));

  const res = await request('/api/auth/change-pin', {
    method: 'POST',
    headers: headers(signStaffToken({ id: 'owner-1', name: 'Owner', role: 'owner' })),
    body: JSON.stringify({ targetUserId: 'barista-1', newPin: '1234' }),
  });

  assert.equal(res.status, 200);
  assert.equal((await res.json()).message, 'PIN updated successfully');
});

test('owner is blocked from creating barista shifts through the shift endpoint', async () => {
  const res = await request('/api/shifts', {
    method: 'POST',
    headers: headers(signStaffToken({ id: 'owner-1', name: 'Owner', role: 'owner' })),
    body: JSON.stringify({ date: '2026-04-18', shiftType: 'am' }),
  });

  assert.equal(res.status, 403);
});

test('inventory writes are denied for shifts owned by another user', async () => {
  stubMethod(prisma.shift, 'findUnique', async () => ({
    id: 'shift-1',
    userId: 'someone-else',
    status: 'in_progress',
  }));

  const res = await request('/api/inventory', {
    method: 'POST',
    headers: headers(signStaffToken({ id: 'barista-1', name: 'Barista 1', role: 'barista_am' })),
    body: JSON.stringify({ shiftId: 'shift-1', beansOpening: 1.2 }),
  });

  assert.equal(res.status, 403);
});

test('stock adjustment is owner-only at the route layer', async () => {
  const res = await request('/api/stock/stock-1/adjust', {
    method: 'PATCH',
    headers: headers(signStaffToken({ id: 'barista-1', name: 'Barista 1', role: 'barista_am' })),
    body: JSON.stringify({ delta: 1 }),
  });

  assert.equal(res.status, 403);
});

test('waste deletion is owner-only at the route layer', async () => {
  const res = await request('/api/waste/waste-1', {
    method: 'DELETE',
    headers: headers(signStaffToken({ id: 'barista-1', name: 'Barista 1', role: 'barista_am' })),
  });

  assert.equal(res.status, 403);
});

test('member profile stays reachable while other member routes are blocked pending password change', async () => {
  stubMethod(prisma.memberAccount, 'findUnique', async (args) => {
    if (args.select?.mustChangePassword) {
      return { mustChangePassword: true };
    }

    return {
      id: 'account-1',
      email: 'member@example.com',
      passwordHash: 'hidden',
      membership: {
        companyName: 'Acme Corp',
        contactPerson: 'Alex',
        whatsapp: '+9779800000000',
        tier: 'team_pack',
        staffCount: 5,
        monthlyFee: 8000,
        renewalDate: new Date('2026-05-01'),
        consecutiveRenewals: 0,
        loyaltyDiscountActive: false,
      },
    };
  });

  const token = signMemberToken({ accountId: 'account-1', membershipId: 'membership-1' });

  const blocked = await request('/api/member/topup', {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ message: 'Need more drinks' }),
  });
  assert.equal(blocked.status, 403);

  const allowed = await request('/api/member/profile', {
    headers: headers(token),
  });
  assert.equal(allowed.status, 200);
});

test('daily pass redemptions are capped per day', async () => {
  stubMethod(prisma.membership, 'findUnique', async () => ({
    id: 'membership-1',
    status: 'active',
    tier: 'daily_pass',
    staffCount: 1,
    drinksPerDay: 1,
    drinksRemaining: null,
  }));
  stubMethod(prisma, '$transaction', async (callback) => callback({
    drinkRedemption: {
      aggregate: async () => ({ _sum: { count: 1 } }),
      create: async () => ({ id: 'redemption-1' }),
    },
    membership: {
      update: async () => ({ id: 'membership-1' }),
    },
  }));

  const res = await request('/api/memberships/membership-1/redeem', {
    method: 'POST',
    headers: headers(signStaffToken({ id: 'barista-1', name: 'Barista 1', role: 'barista_am' })),
    body: JSON.stringify({ count: 1 }),
  });

  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'Daily pass limit exceeded');
});

test('monthly report net profit includes ad-hoc expenses', async () => {
  stubMethod(prisma.financeRecord, 'findMany', async () => [{
    date: new Date('2026-04-01'),
    posTotal: 100,
    totalExpenses: 30,
    netProfit: 70,
    discrepancyFlag: false,
  }]);
  stubMethod(prisma.expense, 'findMany', async () => [{
    date: new Date('2026-04-01'),
    amount: 20,
  }]);
  stubMethod(prisma.shift, 'findMany', async () => []);
  stubMethod(prisma.wasteEntry, 'findMany', async () => []);

  const res = await request('/api/reports/monthly/4/2026', {
    headers: headers(signStaffToken({ id: 'owner-1', name: 'Owner', role: 'owner' })),
  });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.revenue.expenses, 50);
  assert.equal(body.revenue.netProfit, 50);
  assert.equal(body.dailyBreakdown[0].netProfit, 50);
});
