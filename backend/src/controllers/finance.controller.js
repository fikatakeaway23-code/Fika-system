import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const financeSchema = z.object({
  date:                   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  posTotal:               z.number().nonnegative().optional(),
  posCash:                z.number().nonnegative().optional(),
  posDigital:             z.number().nonnegative().optional(),
  baristaCashReported:    z.number().nonnegative().optional(),
  baristaDigitalReported: z.number().nonnegative().optional(),
  rent:                   z.number().nonnegative().optional(),
  electricity:            z.number().nonnegative().optional(),
  barista1Salary:         z.number().nonnegative().optional(),
  barista2Salary:         z.number().nonnegative().optional(),
  milkBill:               z.number().nonnegative().optional(),
  bakeryBill:             z.number().nonnegative().optional(),
  waterJars:              z.number().nonnegative().optional(),
  otherExpense:           z.number().nonnegative().optional(),
  otherNotes:             z.string().optional(),
});

function calculateFinancials(data) {
  const posCash     = data.posCash     ?? 0;
  const posDigital  = data.posDigital  ?? 0;
  const posTotal    = data.posTotal    ?? (posCash + posDigital);
  const reported    = (data.baristaCashReported ?? 0) + (data.baristaDigitalReported ?? 0);
  const cashDiscrepancy = (data.baristaCashReported != null && data.posCash != null)
    ? data.baristaCashReported - data.posCash
    : null;

  const totalExpenses = [
    data.rent, data.electricity, data.barista1Salary,
    data.barista2Salary, data.milkBill, data.bakeryBill,
    data.waterJars, data.otherExpense,
  ].reduce((sum, val) => sum + (val ?? 0), 0);

  const netProfit = posTotal - totalExpenses;

  return {
    posTotal,
    cashDiscrepancy,
    discrepancyFlag: cashDiscrepancy !== null && Math.abs(cashDiscrepancy) > 50,
    totalExpenses,
    netProfit,
  };
}

export async function createFinanceRecord(req, res, next) {
  try {
    const input = financeSchema.parse(req.body);
    const dateObj = new Date(input.date);
    const calc = calculateFinancials(input);

    const record = await prisma.financeRecord.upsert({
      where: { date: dateObj },
      update: { ...input, ...calc, date: dateObj, month: dateObj.getMonth() + 1, year: dateObj.getFullYear() },
      create: {
        ...input,
        ...calc,
        date:    dateObj,
        month:   dateObj.getMonth() + 1,
        year:    dateObj.getFullYear(),
        ownerId: req.user.id,
      },
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function getFinanceRecords(req, res, next) {
  try {
    const { limit = 30, offset = 0 } = req.query;
    const [records, total] = await Promise.all([
      prisma.financeRecord.findMany({
        orderBy: { date: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit),
      }),
      prisma.financeRecord.count(),
    ]);
    res.json({ records, total });
  } catch (err) {
    next(err);
  }
}

export async function getFinanceByDate(req, res, next) {
  try {
    const record = await prisma.financeRecord.findUnique({
      where: { date: new Date(req.params.date) },
    });
    if (!record) return res.status(404).json({ error: 'No finance record for this date' });
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyFinance(req, res, next) {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const records = await prisma.financeRecord.findMany({
      where: { month, year },
      orderBy: { date: 'asc' },
    });

    const summary = records.reduce(
      (acc, r) => ({
        totalRevenue:   acc.totalRevenue   + (r.posTotal    ?? 0),
        totalExpenses:  acc.totalExpenses  + (r.totalExpenses ?? 0),
        netProfit:      acc.netProfit      + (r.netProfit    ?? 0),
        discrepancies:  acc.discrepancies  + (r.discrepancyFlag ? 1 : 0),
      }),
      { totalRevenue: 0, totalExpenses: 0, netProfit: 0, discrepancies: 0 }
    );

    summary.profitMargin = summary.totalRevenue > 0
      ? Math.round((summary.netProfit / summary.totalRevenue) * 100)
      : 0;

    res.json({ month, year, records, summary });
  } catch (err) {
    next(err);
  }
}

export async function getDiscrepancies(req, res, next) {
  try {
    const records = await prisma.financeRecord.findMany({
      where: { discrepancyFlag: true },
      orderBy: { date: 'desc' },
      take: 50,
    });
    res.json(records);
  } catch (err) {
    next(err);
  }
}
