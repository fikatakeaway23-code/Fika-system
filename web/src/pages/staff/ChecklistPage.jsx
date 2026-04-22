import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checklistApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const OPENING_ITEMS = [
  // Arrival & security
  { key: 'arrive_uniform',     label: 'Arrived on time in full, clean uniform' },
  { key: 'unlock_entrance',    label: 'Unlocked main entrance and shutters' },
  { key: 'inspect_entrance',   label: 'Inspected entrance area for safety concerns' },
  // Equipment start-up
  { key: 'lights_on',          label: 'Switched on lights' },
  { key: 'machine_on',         label: 'Espresso machine on (allow 20 min warm-up)' },
  { key: 'grinder_on',         label: 'Grinder switched on' },
  { key: 'chiller_fridge_on',  label: 'Chiller and deep fridge turned on' },
  { key: 'equipment_checked',  label: 'Equipment checked for faults or error codes' },
  { key: 'trash_bins',         label: 'Trash removed and bin liners replaced' },
  // Hygiene
  { key: 'apron_changed',      label: 'Apron changed (clean and pressed)' },
  { key: 'hands_washed',       label: 'Hands washed and sanitised' },
  // Cleaning & station setup
  { key: 'machine_exterior',   label: 'Espresso machine exterior and knock box cleaned' },
  { key: 'portafilters_clean', label: 'Tamper, portafilters and tamping mat cleaned' },
  { key: 'cups_organised',     label: 'Cup holders, sachets and lids organised' },
  { key: 'pos_blender_clean',  label: 'POS machine and blender cleaned' },
  { key: 'chiller_sink_clean', label: 'Chiller, shelves, sink and microwave cleaned' },
  { key: 'floor_swept',        label: 'Floor swept and mopped' },
  { key: 'tables_clean',       label: 'Tables, chairs and mirror cleaned' },
  { key: 'counter_clean',      label: 'Front counter and formica boards cleaned' },
  // Stock & supply check
  { key: 'water_checked',      label: 'Water level in machine and dispenser checked' },
  { key: 'milk_received',      label: 'Milk delivery received and expenses log updated' },
  { key: 'syrups_checked',     label: 'Syrups checked — pump functionality and stock level' },
  { key: 'ice_checked',        label: 'Ice supply checked and refilled if needed' },
  { key: 'bakery_checked',     label: 'Bakery stock checked, order placed if needed' },
  // Final preparation
  { key: 'espresso_dialin',    label: 'Espresso dialled in — test shot pulled and logged' },
  { key: 'coffee_tasted',      label: 'Coffee tasted for quality, grind adjusted if needed' },
  { key: 'float_prepared',     label: 'Opening float prepared (minimum NPR 4,000)' },
  { key: 'music_ambience',     label: 'Music and ambience set to brand standard' },
  { key: 'cafe_ready',         label: 'Café confirmed ready for customers' },
  { key: 'opening_photo',      label: 'Opening photo taken and sent to WhatsApp group' },
];

const CLOSING_ITEMS = [
  // Shutdown
  { key: 'last_customer',      label: 'Last customer served professionally' },
  { key: 'entrance_closed',    label: 'Shutters and main entrance closed' },
  // Post-service cleaning
  { key: 'machine_backflushed', label: 'Espresso machine backflushed with chemical cleaner' },
  { key: 'grinder_purged',     label: 'Grinder purged and hopper wiped clean' },
  { key: 'knockbox_clean',     label: 'Knock box, tamper, portafilter and steam wand cleaned' },
  { key: 'counters_clean',     label: 'Counters, POS terminal, microwave and sink cleaned' },
  { key: 'chiller_clean',      label: 'Chiller shelves and glass panels cleaned' },
  { key: 'bakery_trays',       label: 'Bakery trays and granite surfaces cleaned' },
  { key: 'floor_mopped',       label: 'Floor swept and mopped thoroughly' },
  { key: 'trash_removed',      label: 'All trash removed and bin liners replaced' },
  // Stock & cash
  { key: 'milk_discarded',     label: 'All remaining milk discarded (no carry-over)' },
  { key: 'bakery_logged',      label: 'Bakery stock checked and logged in Inventory Log' },
  { key: 'cash_counted',       label: 'Cash drawer counted (Float + Sales)' },
  { key: 'pos_reconciled',     label: 'Reconciled with POS end-of-day report' },
  { key: 'float_prepared',     label: 'Next-day float prepared (minimum NPR 4,000)' },
  { key: 'cash_secured',       label: 'All cash secured in safe' },
  { key: 'machine_refilled',   label: 'Water levels in machine refilled if needed' },
  // Equipment shutdown
  { key: 'equipment_off',      label: 'Espresso machine, grinder and blender turned off' },
  { key: 'lights_off',         label: 'Main lights off (security lights left on)' },
  { key: 'music_off',          label: 'Music system turned off' },
  { key: 'fridges_closed',     label: 'Fridges and chillers properly closed' },
  { key: 'taps_off',           label: 'All taps off and sinks empty' },
  // Final report
  { key: 'closing_photo',      label: 'Closing photo taken and sent to WhatsApp group' },
  { key: 'daily_report',       label: 'Daily Sales Report completed' },
  { key: 'locked_up',          label: 'All shutters and gates locked' },
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
