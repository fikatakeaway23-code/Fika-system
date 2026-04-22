import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const expenseSchema = z.object({
  name:             z.string().min(1).max(200),
  date:             z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category:         z.enum(['supplies', 'utilities', 'maintenance', 'transport', 'food', 'marketing', 'other']),
  amount:           z.number().positive(),
  paidBy:           z.enum(['barista1', 'barista2', 'owner', 'shop_cash']),
  reimbursed:       z.boolean().optional(),
  receiptAvailable: z.boolean().optional(),
  receiptPhoto:     z.string().optional(),
  notes:            z.string().optional(),
});

export async function createExpense(req, res, next) {
  try {
    const input = expenseSchema.parse(req.body);
    const dateObj = new Date(input.date);
    const allowedPaidBy = {
      owner: ['owner', 'shop_cash', 'barista1', 'barista2'],
      barista_am: ['barista1', 'shop_cash'],
      barista_pm: ['barista2', 'shop_cash'],
    };

    if (!(allowedPaidBy[req.user.role] || []).includes(input.paidBy)) {
      return res.status(403).json({ error: 'You cannot log an expense for that payer' });
    }

    const expense = await prisma.expense.create({
      data: {
        ...input,
        date:     dateObj,
        month:    dateObj.getMonth() + 1,
        year:     dateObj.getFullYear(),
        loggedBy: req.user.id,
      },
    });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function getExpenses(req, res, next) {
  try {
    const { category, month, year, limit = 100, offset = 0 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (month)    where.month    = parseInt(month);
    if (year)     where.year     = parseInt(year);

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: parseInt(offset),
        take: parseInt(limit),
      }),
      prisma.expense.count({ where }),
    ]);

    res.json({ expenses, total });
  } catch (err) {
    next(err);
  }
}

export async function getMonthlyExpenses(req, res, next) {
  try {
    const month = parseInt(req.params.month);
    const year  = parseInt(req.params.year);

    const expenses = await prisma.expense.findMany({
      where: { month, year },
      orderBy: { date: 'asc' },
    });

    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount;
      return acc;
    }, {});

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ month, year, expenses, total, byCategory });
  } catch (err) {
    next(err);
  }
}

export async function updateExpense(req, res, next) {
  try {
    const data = expenseSchema.partial().parse(req.body);
    if (data.date) {
      const d = new Date(data.date);
      data.month = d.getMonth() + 1;
      data.year  = d.getFullYear();
      data.date  = d;
    }
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(expense);
  } catch (err) {
    next(err);
  }
}

export async function deleteExpense(req, res, next) {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
}
