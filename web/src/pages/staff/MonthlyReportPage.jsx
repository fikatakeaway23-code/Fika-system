import React, { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { reportApi } from '../../lib/api.js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const PIE_COLORS = ['#6BCB77', '#2D6A4F', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#10B981'];

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

export function MonthlyReportPage() {
  const [cursor, setCursor] = useState(new Date());
  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-report-web', month, year],
    queryFn: () => reportApi.monthly(month, year).then((r) => r.data),
    staleTime: 300_000,
  });

  const revenue    = data?.revenue    ?? {};
  const expenses   = data?.expenses   ?? {};
  const operations = data?.operations ?? {};
  const waste      = data?.waste      ?? {};
  const drinks     = data?.drinks     ?? [];

  const netProfit = (revenue.total ?? 0) - (expenses.total ?? 0);

  const drinksBarData = drinks.slice(0, 8).map((d) => ({ name: d.name, count: d.count }));

  const expensePieData = Object.entries(expenses.byCategory ?? {}).map(([cat, amt]) => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: Number(amt),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Monthly Report</h1>
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => setCursor((c) => subMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-muted hover:bg-gray-50 text-lg">‹</button>
          <span className="font-bold text-gray-900 min-w-[120px] text-center">{format(cursor, 'MMMM yyyy')}</span>
          <button
            onClick={() => cursor < new Date() && setCursor((c) => addMonths(c, 1))}
            className="w-8 h-8 rounded-full border border-gray-200 text-muted hover:bg-gray-50 text-lg disabled:opacity-30"
            disabled={cursor >= new Date()}
          >›</button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted text-center py-12">Loading report…</p>
      ) : !data ? (
        <p className="text-muted text-center py-12">No data for this month.</p>
      ) : (
        <>
          {/* Summary metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue"  value={`NPR ${(revenue.total ?? 0).toLocaleString()}`}   sub="gross sales" />
            <StatCard label="Net Profit"     value={`NPR ${netProfit.toLocaleString()}`}              sub="after expenses" />
            <StatCard label="Total Expenses" value={`NPR ${(expenses.total ?? 0).toLocaleString()}`}  sub="all categories" />
            <StatCard label="Shifts Done"    value={String(operations.shiftsCompleted ?? 0)}           sub="completed" />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top drinks bar chart */}
            {drinksBarData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4">Top Drinks</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={drinksBarData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6BCB77" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Expenses pie chart */}
            {expensePieData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-bold text-gray-900 mb-4">Expense Breakdown</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={expensePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {expensePieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-gray-700">{v}</span>} />
                    <Tooltip formatter={(v) => `NPR ${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Stats tables */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Revenue */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3">Revenue</h2>
              <Table rows={[
                { label: 'Total',   value: `NPR ${(revenue.total ?? 0).toLocaleString()}` },
                { label: 'Cash',    value: `NPR ${(revenue.cash ?? 0).toLocaleString()}` },
                { label: 'Digital', value: `NPR ${(revenue.digital ?? 0).toLocaleString()}` },
                { label: 'Net Profit', value: `NPR ${netProfit.toLocaleString()}`, highlight: netProfit > 0 },
              ]} />
            </div>

            {/* Operations */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3">Operations</h2>
              <Table rows={[
                { label: 'Shifts Completed',  value: String(operations.shiftsCompleted ?? 0) },
                { label: 'Avg Drinks/Shift',  value: operations.avgDrinksPerShift != null ? operations.avgDrinksPerShift.toFixed(1) : '—' },
                { label: 'Total Drinks',      value: String(operations.totalDrinks ?? 0) },
                { label: 'Total Pastries',    value: String(operations.totalPastries ?? 0) },
              ]} />
            </div>

            {/* Waste */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="font-bold text-gray-900 mb-3">Waste</h2>
              <Table rows={[
                { label: 'Calibration Shots', value: String(waste.calibrationShots ?? 0) },
                { label: 'Milk Wasted (ml)',  value: String(waste.milkWasted ?? 0) },
                { label: 'Drinks Remade',     value: String(waste.remadeDrinks ?? 0) },
                { label: 'Unsold Pastries',   value: String(waste.unsoldPastries ?? 0) },
              ]} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Table({ rows }) {
  return (
    <div className="divide-y divide-gray-50">
      {rows.map(({ label, value, highlight }) => (
        <div key={label} className="flex justify-between py-2.5 text-sm">
          <span className="text-muted">{label}</span>
          <span className={`font-semibold ${highlight ? 'text-secondary' : 'text-gray-900'}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}
