import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { targetApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const EMPTY = { period: 'monthly', targetAmount: '', drinksTarget: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), notes: '' };

export function TargetsPage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { data: progressData } = useQuery({
    queryKey: ['target-progress'],
    queryFn: targetApi.getProgress,
    refetchInterval: 60000,
  });

  const { data: targetsData, isLoading } = useQuery({
    queryKey: ['targets', currentYear],
    queryFn: () => targetApi.getAll({ year: currentYear }),
  });

  const progress = progressData?.data?.data;
  const targets = targetsData?.data?.data ?? [];
  const monthlyTargets = targets.filter(t => t.period === 'monthly').sort((a,b) => a.month - b.month);

  const createMut = useMutation({
    mutationFn: targetApi.create,
    onSuccess: () => { qc.invalidateQueries(['targets']); qc.invalidateQueries(['target-progress']); setForm(EMPTY); setShowForm(false); setMsg('Target set.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => targetApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['targets']); qc.invalidateQueries(['target-progress']); setEditing(null); setShowForm(false); setMsg('Updated.'); },
  });

  const deleteMut = useMutation({
    mutationFn: targetApi.delete,
    onSuccess: () => { qc.invalidateQueries(['targets']); qc.invalidateQueries(['target-progress']); setMsg('Deleted.'); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      targetAmount: parseFloat(form.targetAmount),
      drinksTarget: form.drinksTarget ? parseInt(form.drinksTarget) : null,
      month: form.period === 'monthly' ? parseInt(form.month) : null,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  function startEdit(t) {
    setEditing(t);
    setForm({ period: t.period, targetAmount: t.targetAmount, drinksTarget: t.drinksTarget ?? '', month: t.month ?? currentMonth, year: t.year, notes: t.notes ?? '' });
    setShowForm(true);
  }

  const pct = progress?.monthly?.progress;
  const actual = progress?.monthly?.actual ?? 0;
  const target = progress?.monthly?.target?.targetAmount ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Sales Targets</h1>
          <p className="text-sm text-gray-500 mt-0.5">{currentYear} performance goals</p>
        </div>
        {owner && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
            {showForm ? 'Cancel' : 'Set Target'}
          </button>
        )}
      </div>

      {/* This month progress */}
      {progress?.monthly?.target && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-500">{MONTHS[currentMonth - 1]} {currentYear} Target</p>
              <p className="text-2xl font-extrabold text-gray-900">NPR {actual.toLocaleString()}</p>
              <p className="text-sm text-gray-500">of NPR {target.toLocaleString()} target</p>
            </div>
            <div className="text-right">
              <p className={`text-4xl font-extrabold ${pct >= 100 ? 'text-green-600' : pct >= 75 ? 'text-secondary' : pct >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                {pct !== null ? `${pct}%` : '—'}
              </p>
              <p className="text-xs text-gray-400">achieved</p>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 75 ? 'bg-secondary' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
          </div>
          {pct !== null && pct < 100 && (
            <p className="text-xs text-gray-500 mt-2">NPR {(target - actual).toLocaleString()} remaining to hit target</p>
          )}
          {pct !== null && pct >= 100 && (
            <p className="text-xs text-green-600 font-semibold mt-2">Target achieved! NPR {(actual - target).toLocaleString()} over target</p>
          )}
        </div>
      )}

      {!progress?.monthly?.target && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm px-4 py-3 rounded-xl">
          No target set for {MONTHS[currentMonth - 1]} {currentYear}.
          {owner && ' Click "Set Target" to add one.'}
        </div>
      )}

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {showForm && owner && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Target' : 'Set New Target'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Period</label>
              <select value={form.period} onChange={e => setForm(f => ({...f, period: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            {form.period === 'monthly' && (
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Month</label>
                <select value={form.month} onChange={e => setForm(f => ({...f, month: parseInt(e.target.value)}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {MONTHS.map((m, i) => <option key={i} value={i+1}>{m} {form.year}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Revenue Target (NPR)</label>
              <input type="number" value={form.targetAmount} onChange={e => setForm(f => ({...f, targetAmount: e.target.value}))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 150000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Drinks Target (optional)</label>
              <input type="number" value={form.drinksTarget} onChange={e => setForm(f => ({...f, drinksTarget: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. 500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Notes (optional)</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Any notes" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm">
              {editing ? 'Save' : 'Set Target'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-gray-600 font-semibold text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Monthly targets grid */}
      {monthlyTargets.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="font-bold text-gray-900 text-sm">Monthly Targets — {currentYear}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {monthlyTargets.map(t => (
              <div key={t.id} className={`flex items-center gap-4 px-5 py-3 ${t.month === currentMonth ? 'bg-primary/5' : ''}`}>
                <span className={`text-sm font-bold w-8 ${t.month === currentMonth ? 'text-secondary' : 'text-gray-500'}`}>{MONTHS[t.month - 1]}</span>
                <span className="flex-1 text-sm text-gray-700">NPR {t.targetAmount.toLocaleString()}</span>
                {t.drinksTarget && <span className="text-xs text-gray-400">{t.drinksTarget} drinks</span>}
                {t.notes && <span className="text-xs text-gray-400 truncate max-w-32">{t.notes}</span>}
                {owner && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                    <button onClick={() => { if(confirm('Delete?')) deleteMut.mutate(t.id); }} className="text-xs text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && targets.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No targets set for {currentYear}</p>
          {owner && <p className="text-sm mt-1">Set monthly targets to track progress</p>}
        </div>
      )}
    </div>
  );
}
