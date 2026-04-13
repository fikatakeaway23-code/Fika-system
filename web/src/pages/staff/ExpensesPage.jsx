import React, { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const CATEGORIES = ['supplies', 'utilities', 'maintenance', 'transport', 'food', 'marketing', 'other'];
const PAID_BY    = ['barista1', 'barista2', 'owner', 'shop_cash'];
const CAT_COLORS = { supplies: '#6BCB77', utilities: '#F59E0B', maintenance: '#EF4444', transport: '#8B5CF6', food: '#10B981', marketing: '#3B82F6', other: '#718096' };

export function ExpensesPage() {
  const [cursor, setCursor]   = useState(new Date());
  const [form, setForm]       = useState({ name: '', amount: '', category: 'supplies', paidBy: 'shop_cash', receiptAvailable: false, reimbursed: false });
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState('');
  const user = getUser();
  const qc   = useQueryClient();

  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['expenses-web', month, year],
    queryFn: () => expenseApi.getMonthly(month, year).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: addExp, isPending } = useMutation({
    mutationFn: (payload) => expenseApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses-web', month, year] });
      setForm({ name: '', amount: '', category: 'supplies', paidBy: 'shop_cash', receiptAvailable: false, reimbursed: false });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err?.response?.data?.message ?? 'Failed to add expense.'),
  });

  const { mutate: deleteExp } = useMutation({
    mutationFn: (id) => expenseApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses-web', month, year] }),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name required.'); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { setError('Valid amount required.'); return; }
    const today = format(new Date(), 'yyyy-MM-dd');
    addExp({ ...form, amount: parseFloat(form.amount), date: today, month, year, loggedBy: user?.role ?? 'owner' });
    setError('');
  }

  const expenses   = data?.expenses ?? [];
  const byCategory = data?.byCategory ?? {};
  const total      = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Expenses</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setCursor((c) => subMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-muted hover:bg-gray-50">‹</button>
          <span className="font-bold text-gray-900 min-w-[110px] text-center text-sm">{format(cursor, 'MMMM yyyy')}</span>
          <button onClick={() => cursor < new Date() && setCursor((c) => addMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-muted hover:bg-gray-50" disabled={cursor >= new Date()}>›</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Add form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Log Expense</h2>
          {saved && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-semibold">✓ Expense logged.</div>}
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">{error}</div>}

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Milk delivery" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Amount (NPR) *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Paid By</label>
              <select value={form.paidBy} onChange={(e) => setForm((f) => ({ ...f, paidBy: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {PAID_BY.map((p) => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.receiptAvailable} onChange={(e) => setForm((f) => ({ ...f, receiptAvailable: e.target.checked }))} className="accent-primary" />
                Receipt
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.reimbursed} onChange={(e) => setForm((f) => ({ ...f, reimbursed: e.target.checked }))} className="accent-primary" />
                Reimburse
              </label>
            </div>
            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
              {isPending ? 'Saving…' : 'Log Expense'}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Expenses — {format(cursor, 'MMMM yyyy')}</h2>
            {total > 0 && <span className="font-extrabold text-secondary">NPR {total.toLocaleString()}</span>}
          </div>

          {/* Category chips */}
          {Object.keys(byCategory).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(byCategory).map(([cat, amt]) => (
                <span key={cat} className="text-xs font-bold px-2.5 py-1 rounded-full border" style={{ color: CAT_COLORS[cat] ?? '#718096', borderColor: (CAT_COLORS[cat] ?? '#718096') + '60', backgroundColor: (CAT_COLORS[cat] ?? '#718096') + '15' }}>
                  {cat} · NPR {Number(amt).toLocaleString()}
                </span>
              ))}
            </div>
          )}

          {isLoading ? (
            <p className="text-muted text-sm text-center py-8">Loading…</p>
          ) : !expenses.length ? (
            <p className="text-muted text-sm text-center py-8">No expenses this month.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[exp.category] ?? '#718096' }} />
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{exp.name}</p>
                      <p className="text-xs text-muted">{format(new Date(exp.date), 'd MMM')} · {exp.category} · {exp.paidBy?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-secondary text-sm">NPR {Number(exp.amount).toLocaleString()}</span>
                    <button
                      onClick={() => { if (window.confirm(`Delete "${exp.name}"?`)) deleteExp(exp.id); }}
                      className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
