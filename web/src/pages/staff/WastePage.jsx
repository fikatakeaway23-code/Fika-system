import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subMonths, addMonths } from 'date-fns';
import { wasteApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const CATEGORIES = ['beans','milk','syrup','food','packaging','cleaning','other'];
const CAT_LABELS  = { beans:'Coffee Beans', milk:'Milk & Dairy', syrup:'Syrups', food:'Food', packaging:'Packaging', cleaning:'Cleaning', other:'Other' };
const REASONS     = ['expired','spilled','remade','overproduced','damaged','other'];
const REASON_LABELS = { expired:'Expired', spilled:'Spilled', remade:'Remade', overproduced:'Overproduced', damaged:'Damaged', other:'Other' };
const REASON_COLORS = {
  expired:'bg-red-100 text-red-700', spilled:'bg-orange-100 text-orange-700',
  remade:'bg-yellow-100 text-yellow-700', overproduced:'bg-purple-100 text-purple-700',
  damaged:'bg-pink-100 text-pink-700', other:'bg-gray-100 text-gray-600',
};
const UNITS = ['kg','g','litre','ml','pieces','boxes','portions'];

const today = format(new Date(), 'yyyy-MM-dd');
const EMPTY = { date: today, shiftType: 'am', item: '', category: 'beans', quantity: '', unit: 'kg', reason: 'spilled', cost: '', notes: '' };

export function WastePage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [cursor, setCursor]     = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [msg, setMsg]           = useState('');

  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['waste', month, year],
    queryFn: () => wasteApi.getAll({ month, year }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['waste-summary', month, year],
    queryFn: () => wasteApi.getSummary({ month, year }),
  });

  const entries  = data?.data?.data ?? [];
  const summary  = summaryData?.data?.data;
  const totalCost = summary?.totalCost ?? 0;

  const createMut = useMutation({
    mutationFn: wasteApi.create,
    onSuccess: () => {
      qc.invalidateQueries(['waste']); qc.invalidateQueries(['waste-summary']);
      setForm({ ...EMPTY, date: today });
      setShowForm(false);
      flash('Waste entry logged.');
    },
  });

  const deleteMut = useMutation({
    mutationFn: wasteApi.delete,
    onSuccess: () => { qc.invalidateQueries(['waste']); qc.invalidateQueries(['waste-summary']); flash('Deleted.'); },
  });

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 2500); }

  function handleSubmit(e) {
    e.preventDefault();
    createMut.mutate({ ...form, quantity: parseFloat(form.quantity), cost: form.cost ? parseFloat(form.cost) : null });
  }

  // Group entries by date
  const grouped = entries.reduce((acc, e) => {
    const d = e.date.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Waste Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track daily waste and losses</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setCursor(c => subMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold">‹</button>
            <span className="font-semibold text-gray-900 text-sm min-w-[100px] text-center">{format(cursor, 'MMM yyyy')}</span>
            <button onClick={() => cursor < new Date() && setCursor(c => addMonths(c, 1))} disabled={cursor >= new Date()} className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold disabled:opacity-40">›</button>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90 transition-colors">
            {showForm ? 'Cancel' : 'Log Waste'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-gray-900">{summary.totalEntries}</p>
            <p className="text-xs text-gray-500 mt-1">Total Entries</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-red-500">NPR {totalCost.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Estimated Loss</p>
          </div>
          {Object.entries(summary.byReason ?? {}).slice(0, 2).map(([reason, count]) => (
            <div key={reason} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
              <p className="text-2xl font-extrabold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 mt-1">{REASON_LABELS[reason] ?? reason}</p>
            </div>
          ))}
        </div>
      )}

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl font-medium">{msg}</div>}

      {/* Log form */}
      {showForm && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Log Waste Entry</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({...f, date: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Shift</label>
                <select value={form.shiftType} onChange={e => setForm(f => ({...f, shiftType: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  <option value="am">Morning (AM)</option>
                  <option value="pm">Afternoon (PM)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Item Name</label>
                <input value={form.item} onChange={e => setForm(f => ({...f, item: e.target.value}))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="e.g. Full cream milk" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reason</label>
                <select value={form.reason} onChange={e => setForm(f => ({...f, reason: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {REASONS.map(r => <option key={r} value={r}>{REASON_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Quantity</label>
                <input type="number" min="0" step="0.1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cost (NPR, optional)</label>
                <input type="number" min="0" step="1" value={form.cost} onChange={e => setForm(f => ({...f, cost: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="Estimated loss" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="Optional details" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMut.isPending} className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90 disabled:opacity-50">
                {createMut.isPending ? 'Saving...' : 'Log Entry'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 font-semibold text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {isLoading && <div className="text-center text-gray-400 py-12">Loading...</div>}

      {/* Grouped by date */}
      {Object.entries(grouped).sort((a,b) => b[0].localeCompare(a[0])).map(([date, dayEntries]) => (
        <div key={date} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <p className="font-bold text-gray-900 text-sm">{format(new Date(date + 'T00:00:00'), 'EEEE, d MMM yyyy')}</p>
            <span className="text-xs text-gray-400">{dayEntries.length} entries</span>
          </div>
          <div className="divide-y divide-gray-50">
            {dayEntries.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm">{entry.item}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${REASON_COLORS[entry.reason]}`}>{REASON_LABELS[entry.reason]}</span>
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{entry.shiftType}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{CAT_LABELS[entry.category]} · {entry.quantity} {entry.unit}{entry.notes ? ` · ${entry.notes}` : ''}</p>
                </div>
                {entry.cost ? <span className="text-sm font-bold text-red-500 flex-shrink-0">NPR {entry.cost.toLocaleString()}</span> : null}
                {owner && (
                  <button onClick={() => { if (confirm('Delete entry?')) deleteMut.mutate(entry.id); }} className="text-xs text-red-400 font-semibold px-2 py-1 rounded hover:bg-red-50 flex-shrink-0">Delete</button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && entries.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No waste entries for {format(cursor, 'MMMM yyyy')}</p>
          <p className="text-sm mt-1">Log waste to track losses and improve efficiency</p>
        </div>
      )}
    </div>
  );
}
