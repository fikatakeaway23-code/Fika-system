import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isToday, parseISO } from 'date-fns';
import { scheduleApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const STAFF = ['Barista 1', 'Barista 2', 'Owner'];

const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export function SchedulePage() {
  const qc    = useQueryClient();
  const owner = isOwner();
  const [cursor, setCursor]     = useState(new Date());
  const [selected, setSelected] = useState(null); // { date, shiftType }
  const [form, setForm]         = useState({ staffName: 'Barista 1', notes: '', confirmed: false });
  const [msg, setMsg]           = useState('');

  const month = cursor.getMonth() + 1;
  const year  = cursor.getFullYear();

  const { data } = useQuery({
    queryKey: ['schedule', month, year],
    queryFn: () => scheduleApi.getAll({ month, year }),
  });

  const entries = data?.data?.data ?? [];

  // Build a lookup: "YYYY-MM-DD:am" → entry
  const lookup = {};
  entries.forEach(e => {
    const key = `${e.date.slice(0,10)}:${e.shiftType}`;
    lookup[key] = e;
  });

  const saveMut = useMutation({
    mutationFn: scheduleApi.save,
    onSuccess: () => { qc.invalidateQueries(['schedule']); setSelected(null); flash('Schedule saved.'); },
  });

  const deleteMut = useMutation({
    mutationFn: scheduleApi.delete,
    onSuccess: () => { qc.invalidateQueries(['schedule']); setSelected(null); flash('Removed.'); },
  });

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 2000); }

  // Calendar grid
  const monthStart = startOfMonth(cursor);
  const monthEnd   = endOfMonth(cursor);
  const days       = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start: Mon=0 offset
  const startDow = (getDay(monthStart) + 6) % 7; // 0=Mon
  const padStart = Array(startDow).fill(null);

  function openSlot(date, shiftType) {
    if (!owner) return;
    const key     = `${format(date, 'yyyy-MM-dd')}:${shiftType}`;
    const existing = lookup[key];
    setSelected({ date: format(date, 'yyyy-MM-dd'), shiftType });
    setForm({
      staffName: existing?.staffName ?? 'Barista 1',
      notes:     existing?.notes    ?? '',
      confirmed: existing?.confirmed ?? false,
    });
  }

  function handleSave(e) {
    e.preventDefault();
    saveMut.mutate({ date: selected.date, shiftType: selected.shiftType, ...form });
  }

  function handleDelete() {
    const key = `${selected.date}:${selected.shiftType}`;
    const entry = lookup[key];
    if (entry) deleteMut.mutate(entry.id);
    else setSelected(null);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">Plan and manage shift assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(c => subMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold">‹</button>
          <span className="font-bold text-gray-900 min-w-[120px] text-center text-sm">{format(cursor, 'MMMM yyyy')}</span>
          <button onClick={() => setCursor(c => addMonths(c, 1))} className="w-8 h-8 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm font-bold">›</button>
        </div>
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl font-medium">{msg}</div>}

      {owner && (
        <p className="text-xs text-gray-400 bg-white border border-gray-100 rounded-xl px-4 py-2 shadow-sm">
          Click any shift slot to assign staff. AM = 6 AM–2 PM, PM = 12 PM–8 PM.
        </p>
      )}

      {/* Calendar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {padStart.map((_, i) => <div key={`pad-${i}`} className="border-r border-b border-gray-50 min-h-[90px]" />)}
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const amEntry = lookup[`${dateStr}:am`];
            const pmEntry = lookup[`${dateStr}:pm`];
            const today   = isToday(day);

            return (
              <div key={dateStr} className={`border-r border-b border-gray-50 min-h-[90px] p-1.5 ${today ? 'bg-primary/5' : ''}`}>
                <p className={`text-xs font-bold mb-1.5 ${today ? 'text-secondary' : 'text-gray-600'}`}>{format(day, 'd')}</p>
                {/* AM slot */}
                <button
                  onClick={() => openSlot(day, 'am')}
                  className={`w-full text-left rounded-md px-1.5 py-1 mb-1 text-[10px] font-semibold transition-colors ${
                    amEntry
                      ? amEntry.confirmed
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-secondary/15 text-secondary border border-secondary/20'
                      : owner ? 'bg-gray-50 text-gray-300 hover:bg-gray-100 hover:text-gray-400 border border-gray-100' : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <span className="block leading-tight font-bold">AM</span>
                  {amEntry && <span className="block leading-tight truncate">{amEntry.staffName}</span>}
                </button>
                {/* PM slot */}
                <button
                  onClick={() => openSlot(day, 'pm')}
                  className={`w-full text-left rounded-md px-1.5 py-1 text-[10px] font-semibold transition-colors ${
                    pmEntry
                      ? pmEntry.confirmed
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-purple-50 text-purple-800 border border-purple-200'
                      : owner ? 'bg-gray-50 text-gray-300 hover:bg-gray-100 hover:text-gray-400 border border-gray-100' : 'bg-gray-50 border border-gray-100'
                  }`}
                >
                  <span className="block leading-tight font-bold">PM</span>
                  {pmEntry && <span className="block leading-tight truncate">{pmEntry.staffName}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 flex-wrap text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-secondary/15 border border-secondary/20 inline-block" /> Assigned (unconfirmed)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-purple-50 border border-purple-200 inline-block" /> PM shift</span>
      </div>

      {/* Assign panel */}
      {selected && owner && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900">Assign Shift</h3>
                <p className="text-xs text-gray-500">{format(parseISO(selected.date), 'EEE d MMM yyyy')} · {selected.shiftType === 'am' ? 'AM (6AM–2PM)' : 'PM (12PM–8PM)'}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Staff Member</label>
                <select value={form.staffName} onChange={e => setForm(f => ({...f, staffName: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {STAFF.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="Optional" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.confirmed} onChange={e => setForm(f => ({...f, confirmed: e.target.checked}))} className="accent-secondary w-4 h-4" />
                <span className="text-sm font-medium text-gray-700">Mark as confirmed</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saveMut.isPending} className="flex-1 py-2.5 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90 disabled:opacity-50">
                  {saveMut.isPending ? 'Saving...' : 'Save'}
                </button>
                {lookup[`${selected.date}:${selected.shiftType}`] && (
                  <button type="button" onClick={handleDelete} className="px-4 py-2.5 bg-red-50 text-red-500 font-semibold rounded-xl text-sm hover:bg-red-100">Remove</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming list */}
      {entries.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50">
            <p className="font-bold text-gray-900 text-sm">All Assignments — {format(cursor, 'MMMM yyyy')}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {entries.map(e => (
              <div key={e.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{format(parseISO(e.date.slice(0,10)), 'EEE d MMM')} · <span className={`font-bold ${e.shiftType === 'am' ? 'text-secondary' : 'text-purple-600'}`}>{e.shiftType.toUpperCase()}</span></p>
                  {e.notes && <p className="text-xs text-gray-400">{e.notes}</p>}
                </div>
                <span className="text-sm font-semibold text-gray-700">{e.staffName}</span>
                {e.confirmed
                  ? <span className="text-[10px] font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Confirmed</span>
                  : <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">Pending</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
