import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const TIER_ROLLOVER_CAPS = {
  daily_pass: 5,
  team_pack: 8,
  office_bundle: 10,
};

const membershipSchema = z.object({
  companyName:   z.string().min(1).max(200),
  contactPerson: z.string().min(1),
  whatsapp:      z.string().min(1),
  address:       z.string().optional(),
  distance:      z.string().optional(),
  tier:          z.enum(['daily_pass', 'team_pack', 'office_bundle']),
  staffCount:    z.number().int().positive(),
  drinksPerDay:  z.number().int().nonnegative().optional(),
  monthlyFee:    z.number().positive(),
  paymentStatus: z.enum(['paid', 'unpaid', 'overdue']).optional(),
  paymentDate:   z.string().optional(),
  renewalDate:   z.string().optional(),
  preferredTime: z.string().optional(),
  usualOrder:    z.string().optional(),
  notes:         z.string().optional(),
  status:        z.enum(['active', 'pending', 'expired', 'cancelled']).optional(),
  joinedDate:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const tierDrinkLimits = {
  daily_pass:    null,   // 1/day per person
  team_pack:     30,
  office_bundle: null,   // unlimited
};

function getDrinksAllotment(tier, staffCount) {
  if (tier === 'daily_pass') return null;
  if (tier === 'team_pack')  return 30;
  return null; // unlimited
}

export async function createMembership(req, res, next) {
  try {
    const input = membershipSchema.parse(req.body);

    const membership = await prisma.membership.create({
      data: {
        ...input,
        joinedDate:  input.joinedDate  ? new Date(input.joinedDate)  : new Date(),
        paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
        renewalDate: input.renewalDate ? new Date(input.renewalDate) : undefined,
        drinksRemaining: getDrinksAllotment(input.tier, input.staffCount),
      },
    });

    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

export async function getMemberships(req, res, next) {
  try {
    const { status, tier, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (tier)   where.tier   = tier;
    if (search) where.companyName = { contains: search, mode: 'insensitive' };

    const memberships = await prisma.membership.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(memberships);
  } catch (err) {
    next(err);
  }
}

export async function getMembershipById(req, res, next) {
  try {
    const membership = await prisma.membership.findUnique({
      where: { id: req.params.id },
    });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    res.json(membership);
  } catch (err) {
    next(err);
  }
}

export async function updateMembership(req, res, next) {
  try {
    const input = membershipSchema.partial().parse(req.body);
    if (input.joinedDate)  input.joinedDate  = new Date(input.joinedDate);
    if (input.paymentDate) input.paymentDate = new Date(input.paymentDate);
    if (input.renewalDate) input.renewalDate = new Date(input.renewalDate);

    const membership = await prisma.membership.update({
      where: { id: req.params.id },
      data: input,
    });

    res.json(membership);
  } catch (err) {
    next(err);
  }
}

export async function deleteMembership(req, res, next) {
  try {
    await prisma.membership.delete({ where: { id: req.params.id } });
    res.json({ message: 'Membership deleted' });
  } catch (err) {
    next(err);
  }
}

export async function incrementDrinks(req, res, next) {
  try {
    const adjustSchema = z.object({
      delta: z.number().int().positive().default(1),
    });
    const { delta } = adjustSchema.parse(req.body);
    const membership = await prisma.membership.findUnique({ where: { id: req.params.id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    if (membership.drinksRemaining !== null && membership.drinksRemaining < delta) {
      return res.status(400).json({
        error: 'Insufficient balance',
        drinksRemaining: membership.drinksRemaining,
      });
    }

    const updated = await prisma.membership.update({
      where: { id: req.params.id },
      data: {
        drinksUsed: { increment: delta },
        ...(membership.drinksRemaining !== null && {
          drinksRemaining: { decrement: delta },
        }),
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

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
    const startOfDay = new Date(now);
    const endOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    endOfDay.setHours(23, 59, 59, 999);

    const { redemption, updated } = await prisma.$transaction(async (tx) => {
      if (membership.tier === 'daily_pass') {
        const dailyLimit = membership.drinksPerDay ?? membership.staffCount;
        const redeemedToday = await tx.drinkRedemption.aggregate({
          where: {
            membershipId: id,
            redeemedAt: { gte: startOfDay, lte: endOfDay },
          },
          _sum: { count: true },
        });
        const totalToday = redeemedToday._sum.count ?? 0;

        if (totalToday + count > dailyLimit) {
          throw Object.assign(new Error('Daily pass limit exceeded'), {
            status: 400,
            details: { dailyLimit, redeemedToday: totalToday },
          });
        }
      }

      const redemption = await tx.drinkRedemption.create({
        data: {
          membershipId:     id,
          count,
          notes,
          drinkType,
          redeemedByUserId: req.user.id,
          month,
          year,
        },
      });

      const updated = await tx.membership.update({
        where: { id },
        data: {
          drinksUsed: { increment: count },
          ...(membership.drinksRemaining !== null && {
            drinksRemaining: { decrement: count },
          }),
        },
      });

      return { redemption, updated };
    });

    res.json({ redemption, membership: updated });
  } catch (err) {
    if (err.status === 400 && err.message === 'Daily pass limit exceeded') {
      return res.status(400).json({
        error: err.message,
        ...err.details,
      });
    }
    next(err);
  }
}

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
      const name = r.redeemedBy?.name ?? 'Unknown';
      byBarista[name] = (byBarista[name] || 0) + r.count;
    }

    res.json({ month, year, totalDrinks, byDay, byBarista });
  } catch (err) {
    next(err);
  }
}

export async function renewMembership(req, res, next) {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

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
        drinksUsed:            0,
        drinksRemaining:       newDrinksRemaining,
        rolloverDrinks:        rolloverEarned,
        consecutiveRenewals:   newConsecutive,
        loyaltyDiscountActive: newConsecutive >= 3,
        monthsActive:          { increment: 1 },
        totalRevenue:          { increment: membership.monthlyFee ?? 0 },
      },
    });

    res.json({ membership: updated, rolloverEarned, newConsecutive });
  } catch (err) {
    next(err);
  }
}

// GET /api/memberships/:id/qr
export async function getMemberQrCode(req, res, next) {
  try {
    const { id } = req.params;
    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });
    const account = await prisma.memberAccount.findUnique({
      where: { membershipId: id }, select: { email: true },
    });
    if (!account) return res.status(404).json({ error: 'No portal account for this membership' });
    const portalUrl = process.env.MEMBER_PORTAL_URL || 'http://localhost:5173';
    const loginUrl = `${portalUrl}?email=${encodeURIComponent(account.email)}`;
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(loginUrl, { width: 300, margin: 2, color: { dark: '#1a1a1a', light: '#ffffff' } });
    res.json({ qrDataUrl, loginUrl });
  } catch (err) {
    next(err);
  }
}

// GET /api/memberships/topup-requests?status=pending
export async function getTopUpRequests(req, res, next) {
  try {
    const statusParam = z.enum(['pending', 'acknowledged', 'fulfilled']).optional().catch(undefined).parse(req.query.status);
    const where = statusParam ? { status: statusParam } : {};
    const requests = await prisma.topUpRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        membership: {
          select: { id: true, companyName: true, whatsapp: true, tier: true, drinksRemaining: true },
        },
      },
    });
    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/memberships/topup-requests/:requestId
export async function updateTopUpRequest(req, res, next) {
  try {
    const { requestId } = req.params;
    const { status } = z.object({
      status: z.enum(['acknowledged', 'fulfilled']),
    }).parse(req.body);

    const existing = await prisma.topUpRequest.findUnique({ where: { id: requestId } });
    if (!existing) return res.status(404).json({ error: 'Top-up request not found' });

    const updated = await prisma.topUpRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(status === 'acknowledged' && !existing.acknowledgedAt
          ? { acknowledgedAt: new Date() }
          : {}),
      },
    });
    res.json({ request: updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/memberships/:id/invoice?month=4&year=2026
export async function getMembershipInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const now = new Date();
    const { month, year } = z.object({
      month: z.coerce.number().int().min(1).max(12).default(now.getMonth() + 1),
      year:  z.coerce.number().int().min(2020).default(now.getFullYear()),
    }).parse(req.query);

    const membership = await prisma.membership.findUnique({ where: { id } });
    if (!membership) return res.status(404).json({ error: 'Membership not found' });

    const usageMonths = [];
    for (let i = 0; i < 3; i++) {
      const d = new Date(year, month - 1 - i, 1);
      usageMonths.push({ month: d.getMonth() + 1, year: d.getFullYear() });
    }
    const usageData = await Promise.all(
      usageMonths.map(async ({ month: m, year: y }) => {
        const agg = await prisma.drinkRedemption.aggregate({
          where: { membershipId: id, month: m, year: y },
          _sum:  { count: true },
        });
        return {
          label: new Date(y, m - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          total: agg._sum.count ?? 0,
        };
      })
    );

    const safeCompany = membership.companyName.replace(/[^a-z0-9\-_ ]/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fika-invoice-${safeCompany}-${year}-${month}.pdf"`);

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('FIKA TAKEAWAY', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Membership Statement', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.6);

    // Membership details
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Membership Details');
    doc.moveDown(0.3);
    const details = [
      ['Company',        membership.companyName],
      ['Contact Person', membership.contactPerson ?? '—'],
      ['Tier',           membership.tier],
      ['Status',         membership.status],
      ['Monthly Fee',    membership.monthlyFee != null ? `NPR ${Number(membership.monthlyFee).toLocaleString()}` : '—'],
      ['Renewal Date',   membership.renewalDate
        ? new Date(membership.renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—'],
      ['Payment Status', membership.paymentStatus ?? '—'],
    ];
    doc.fontSize(10).font('Helvetica');
    for (const [label, value] of details) {
      doc.fillColor('#6b7280').text(label, { continued: true, width: 150 });
      doc.fillColor('#000').text(value);
    }
    doc.moveDown(0.8);

    // Current balance
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Current Balance');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    doc.fillColor('#6b7280').text('Drinks Remaining', { continued: true, width: 150 });
    doc.fillColor('#000').text(membership.drinksRemaining != null ? String(membership.drinksRemaining) : '—');
    doc.fillColor('#6b7280').text('Drinks Used (lifetime)', { continued: true, width: 150 });
    doc.fillColor('#000').text(String(membership.drinksUsed ?? 0));
    if ((membership.rolloverDrinks ?? 0) > 0) {
      doc.fillColor('#6b7280').text('Rollover Drinks', { continued: true, width: 150 });
      doc.fillColor('#000').text(String(membership.rolloverDrinks));
    }
    doc.moveDown(0.8);

    // Usage history
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text('Recent Usage (Last 3 Months)');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');
    for (const { label, total } of usageData) {
      doc.fillColor('#6b7280').text(label, { continued: true, width: 200 });
      doc.fillColor('#000').text(`${total} drink${total !== 1 ? 's' : ''}`);
    }
    doc.moveDown(1);

    // Footer
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.4);
    doc.fillColor('#9ca3af').fontSize(9)
      .text(`Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, { align: 'center' });
    doc.text('Fika Takeaway — Kathmandu, Nepal', { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}
