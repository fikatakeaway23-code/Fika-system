import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const OPENING_ITEMS = [
  { key: 'machine_warmed',   label: 'Espresso machine warmed up and flushed' },
  { key: 'grinder_dialled',  label: 'Grinder dialled in (test shot pulled)' },
  { key: 'fridge_temp',      label: 'Fridge temperature checked (≤ 4°C)' },
  { key: 'milk_stocked',     label: 'Milk stock counted and restocked if needed' },
  { key: 'pastries_stocked', label: 'Pastries/food display stocked' },
  { key: 'pos_float',        label: 'POS on and float counted' },
  { key: 'cleaning_stocked', label: 'Cleaning supplies stocked' },
  { key: 'bar_wiped',        label: 'Bar area wiped and organised' },
  { key: 'announcement',     label: 'Opening announcement posted (if any)' },
];

const CLOSING_ITEMS = [
  { key: 'machine_backflushed', label: 'Espresso machine backflushed and wiped' },
  { key: 'grinder_cleaned',     label: 'Grinder cleaned and covered' },
  { key: 'milk_refrigerated',   label: 'Milk and perishables refrigerated/discarded' },
  { key: 'cash_counted',        label: 'Cash counted and bagged' },
  { key: 'pos_closed',          label: 'POS closed and daily report submitted' },
  { key: 'bar_wiped',           label: 'Bar and counter wiped down' },
  { key: 'floor_cleaned',       label: 'Floor swept/mopped' },
  { key: 'doors_locked',        label: 'Doors locked and lights off' },
];

function ChecklistPanel({ type, shiftType, today }) {
  const items    = type === 'opening' ? OPENING_ITEMS : CLOSING_ITEMS;
  const qc       = useQueryClient();
  const queryKey = ['checklist', today, shiftType, type];

  const { data: existingData } = useQuery({
    queryKey,
    queryFn: () => checklistApi.get({ date: today, shiftType, checklistType: type }).then((r) => r.data),
    staleTime: 30_000,
  });

  const existing = existingData?.data;

  const [checked, setChecked] = useState({});

  useEffect(() => {
    if (existing?.items) {
      setChecked(existing.items);
    }
  }, [existing]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => checklistApi.save({ date: today, shiftType, checklistType: type, items: checked }),
    onSuccess:  () => qc.invalidateQueries({ queryKey }),
  });

  const allDone = items.every((i) => checked[i.key]);
  const doneCount = items.filter((i) => checked[i.key]).length;

  if (existing) {
    // Read-only submitted view
    return (
      <div className="space-y-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-green-700 font-bold">✓ Submitted</span>
          <span className="text-green-600 text-sm">
            {existing.submittedAt ? format(new Date(existing.submittedAt), 'h:mm a') : ''}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {items.map((item) => (
            <div key={item.key} className="flex items-center gap-3 px-4 py-3">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${existing.items?.[item.key] ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                {existing.items?.[item.key] ? '✓' : '✗'}
              </span>
              <span className={`text-sm ${existing.items?.[item.key] ? 'text-gray-900' : 'text-gray-400'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted font-medium">{doneCount} of {items.length} done</span>
        {allDone && <span className="text-green-600 font-bold">All complete!</span>}
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div className="bg-secondary h-1.5 rounded-full transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface transition-colors">
            <input
              type="checkbox"
              checked={!!checked[item.key]}
              onChange={(e) => setChecked((prev) => ({ ...prev, [item.key]: e.target.checked }))}
              className="w-4 h-4 accent-secondary rounded"
            />
            <span className={`text-sm ${checked[item.key] ? 'line-through text-gray-400' : 'text-gray-900'}`}>{item.label}</span>
          </label>
        ))}
      </div>

      <button
        onClick={() => save()}
        disabled={isPending || doneCount === 0}
        className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {isPending ? 'Saving…' : 'Submit Checklist'}
      </button>
    </div>
  );
}

export function ChecklistPage() {
  const user      = getUser();
  const today     = format(new Date(), 'yyyy-MM-dd');
  const shiftType = user?.role === 'barista_am' ? 'am' : user?.role === 'barista_pm' ? 'pm' : 'am';
  const [tab, setTab] = useState('opening');

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">Checklists</h1>
      <p className="text-muted text-sm -mt-4">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

      {/* Tabs */}
      <div className="flex gap-2">
        {['opening', 'closing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-full text-sm font-bold transition-colors capitalize ${
              tab === t ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-muted hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ChecklistPanel type={tab} shiftType={shiftType} today={today} />
    </div>
  );
}
