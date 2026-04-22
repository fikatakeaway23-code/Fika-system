import { prisma } from '../lib/prisma.js';

export async function getMonthlyReport(req, res, next) {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const [finance, expenses, shifts, wasteEntries] = await Promise.all([
      prisma.financeRecord.findMany({ where: { month, year } }),
      prisma.expense.findMany({ where: { month, year } }),
      prisma.shift.findMany({
        where: {
          date: {
            gte: new Date(year, month - 1, 1),
            lt:  new Date(year, month, 1),
          },
          status: 'submitted',
        },
        include: { inventoryLog: true, wasteLog: true, espressoLog: true },
      }),
      prisma.wasteEntry.findMany({
        where: {
          date: {
            gte: new Date(year, month - 1, 1),
            lt:  new Date(year, month, 1),
          },
        },
      }),
    ]);

    // Revenue summary
    const totalRevenue    = finance.reduce((s, r) => s + (r.posTotal      ?? 0), 0);
    const financeExpenses = finance.reduce((s, r) => s + (r.totalExpenses ?? 0), 0);
    const adHocExpenses   = expenses.reduce((s, e) => s + e.amount, 0);
    const totalExpenses   = financeExpenses + adHocExpenses;
    const netProfit       = totalRevenue - totalExpenses;

    // Drinks
    const totalDrinks = shifts.reduce((s, sh) => s + (sh.drinksCount ?? 0), 0);

    // Most popular drink (mode)
    const drinkCounts = {};
    shifts.forEach((sh) => {
      if (sh.popularDrink) drinkCounts[sh.popularDrink] = (drinkCounts[sh.popularDrink] ?? 0) + 1;
    });
    const popularDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    // Waste
    const totalCalibrationShots = shifts.reduce((s, sh) => s + (sh.wasteLog?.calibrationShots ?? 0), 0);
    const totalMilkWasted       = shifts.reduce((s, sh) => s + (sh.wasteLog?.milkWasted       ?? 0), 0);
    const totalRemadeDrinks     = shifts.reduce((s, sh) => s + (sh.wasteLog?.remadeDrinks      ?? 0), 0);

    // WasteEntry — detailed itemised waste
    const totalWasteCost = wasteEntries.reduce((s, e) => s + (e.cost ?? 0), 0);
    const wasteByCategory = {};
    for (const e of wasteEntries) {
      wasteByCategory[e.category] = (wasteByCategory[e.category] ?? 0) + (e.cost ?? 0);
    }

    // Discrepancy count
    const discrepancies = finance.filter((r) => r.discrepancyFlag).length;
    const adHocByDate = expenses.reduce((acc, expense) => {
      const key = new Date(expense.date).toISOString().split('T')[0];
      acc[key] = (acc[key] ?? 0) + expense.amount;
      return acc;
    }, {});
    const dailyBreakdownMap = new Map();

    for (const record of finance) {
      const key = new Date(record.date).toISOString().split('T')[0];
      const extraExpense = adHocByDate[key] ?? 0;
      dailyBreakdownMap.set(key, {
        date: key,
        revenue: record.posTotal ?? 0,
        expenses: (record.totalExpenses ?? 0) + extraExpense,
        netProfit: (record.posTotal ?? 0) - ((record.totalExpenses ?? 0) + extraExpense),
        discrepancy: record.discrepancyFlag,
      });
    }

    for (const [date, extraExpense] of Object.entries(adHocByDate)) {
      if (!dailyBreakdownMap.has(date)) {
        dailyBreakdownMap.set(date, {
          date,
          revenue: 0,
          expenses: extraExpense,
          netProfit: -extraExpense,
          discrepancy: false,
        });
      }
    }

    res.json({
      month, year,
      revenue: {
        total:          totalRevenue,
        expenses:       totalExpenses,
        financeExpenses,
        adHocExpenses,
        netProfit,
        profitMargin:   totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        discrepancies,
      },
      operations: {
        totalShifts:   shifts.length,
        totalDrinks,
        popularDrink,
        totalCalibrationShots,
        totalMilkWasted,
        totalRemadeDrinks,
      },
      dailyBreakdown: Array.from(dailyBreakdownMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
      wasteEntries: {
        totalEntries: wasteEntries.length,
        estimatedCostLoss: totalWasteCost,
        byCategory: wasteByCategory,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getWeeklyReport(req, res, next) {
  try {
    const now   = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const [shifts, finance] = await Promise.all([
      prisma.shift.findMany({
        where: { date: { gte: start }, status: 'submitted' },
        orderBy: { date: 'asc' },
      }),
      prisma.financeRecord.findMany({
        where: { date: { gte: start } },
        orderBy: { date: 'asc' },
      }),
    ]);

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dayShifts  = shifts.filter((s) => new Date(s.date).toDateString() === d.toDateString());
      const dayFinance = finance.find((f) => new Date(f.date).toDateString() === d.toDateString());

      days.push({
        date:       d.toISOString().split('T')[0],
        revenue:    dayFinance?.posTotal    ?? 0,
        expenses:   dayFinance?.totalExpenses ?? 0,
        netProfit:  dayFinance?.netProfit   ?? 0,
        drinks:     dayShifts.reduce((s, sh) => s + (sh.drinksCount ?? 0), 0),
        shiftsCount: dayShifts.length,
      });
    }

    res.json({ days });
  } catch (err) {
    next(err);
  }
}

export async function getDrinksReport(req, res, next) {
  try {
    const { month, year } = req.query;

    const where = { status: 'submitted' };
    if (month && year) {
      where.date = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt:  new Date(parseInt(year), parseInt(month), 1),
      };
    }

    const shifts = await prisma.shift.findMany({ where });

    const drinkMap = {};
    shifts.forEach((s) => {
      if (s.popularDrink) {
        drinkMap[s.popularDrink] = (drinkMap[s.popularDrink] ?? 0) + 1;
      }
    });

    const ranked = Object.entries(drinkMap)
      .map(([drink, count]) => ({ drink, count }))
      .sort((a, b) => b.count - a.count);

    const totalDrinks = shifts.reduce((s, sh) => s + (sh.drinksCount ?? 0), 0);

    res.json({ totalDrinks, ranked });
  } catch (err) {
    next(err);
  }
}
