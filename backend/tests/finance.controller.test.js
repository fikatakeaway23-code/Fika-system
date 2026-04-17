import { describe, it, expect } from 'vitest';
import { calculateFinancials } from '../src/controllers/finance.controller.ts';

describe('Finance Controller - calculateFinancials', () => {
  it('calculates posTotal correctly from cash and digital', () => {
    const data = { posCash: 1000, posDigital: 500 };
    const result = calculateFinancials(data);
    expect(result.posTotal).toBe(1500);
  });

  it('uses provided posTotal if available', () => {
    const data = { posTotal: 2000, posCash: 1000, posDigital: 500 };
    const result = calculateFinancials(data);
    expect(result.posTotal).toBe(2000);
  });

  it('calculates totalExpenses from all expense fields', () => {
    const data = {
      rent: 5000,
      electricity: 1000,
      barista1Salary: 2000,
      milkBill: 500,
      bakeryBill: null,
      otherExpense: undefined,
    };
    const result = calculateFinancials(data);
    expect(result.totalExpenses).toBe(8500);
  });

  it('calculates netProfit as posTotal - totalExpenses', () => {
    const data = {
      posCash: 10000,
      posDigital: 5000,
      rent: 5000,
    };
    const result = calculateFinancials(data);
    expect(result.posTotal).toBe(15000);
    expect(result.totalExpenses).toBe(5000);
    expect(result.netProfit).toBe(10000);
  });

  it('calculates cashDiscrepancy and sets flag correctly (> 50)', () => {
    const data = {
      posCash: 1000,
      baristaCashReported: 900,
    };
    const result = calculateFinancials(data);
    expect(result.cashDiscrepancy).toBe(-100);
    expect(result.discrepancyFlag).toBe(true);
  });

  it('sets discrepancyFlag to false if discrepancy <= 50', () => {
    const data = {
      posCash: 1000,
      baristaCashReported: 950, // Diff is -50
    };
    const result = calculateFinancials(data);
    expect(result.cashDiscrepancy).toBe(-50);
    expect(result.discrepancyFlag).toBe(false);
  });

  it('handles null values correctly for discrepancy', () => {
    const data = {
      posCash: 1000,
      // baristaCashReported is omitted
    };
    const result = calculateFinancials(data);
    expect(result.cashDiscrepancy).toBeNull();
    expect(result.discrepancyFlag).toBe(false);
  });
});
