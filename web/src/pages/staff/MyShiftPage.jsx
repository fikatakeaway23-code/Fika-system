import React, { useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shiftApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder ?? '0'}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
    />
  );
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30"
    />
  );
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/30 resize-none"
    />
  );
}

export function MyShiftPage() {
  const user      = getUser();
  const today     = format(new Date(), 'yyyy-MM-dd');
  const shiftType = user?.role === 'barista_am' ? 'am' : user?.role === 'barista_pm' ? 'pm' : 'am';
  const qc        = useQueryClient();

  // Fetch today's shifts for the current user
  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ['my-shift-today', today],
    queryFn:  () => shiftApi.getAll({ from: today, to: today }).then((r) => r.data),
    staleTime: 30_000,
  });

  const shifts   = shiftsData?.shifts ?? [];
  const myShift  = shifts.find((s) => s.shiftType === shiftType) ?? null;

  // Opening float for start
  const [openingFloat, setOpeningFloat] = useState('');

  // Report form state
  const [form, setForm] = useState({
    cashSales:      '',
    digitalSales:   '',
    closingCash:    '',
    drinksCount:    '',
    popularDrink:   '',
    pastriesSold:   '',
    equipmentIssue: false,
    equipmentNotes: '',
    complaintFlag:  false,
    complaintNotes: '',
    shiftNotes:     '',
  });

  const set = (key) => (val) => setForm((prev) => ({ ...prev, [key]: val }));

  // Start shift mutation
  const { mutate: startShift, isPending: starting, error: startError } = useMutation({
    mutationFn: () => shiftApi.create({ date: today, shiftType, openingFloat: Number(openingFloat) || undefined }),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['my-shift-today'] }),
  });

  // Update + submit mutation
  const { mutate: submitReport, isPending: submitting, error: submitError } = useMutation({
    mutationFn: async () => {
      const payload = {
        cashSales:      form.cashSales !== '' ? Number(form.cashSales) : undefined,
        digitalSales:   form.digitalSales !== '' ? Number(form.digitalSales) : undefined,
        closingCash:    form.closingCash !== '' ? Number(form.closingCash) : undefined,
        drinksCount:    form.drinksCount !== '' ? Number(form.drinksCount) : undefined,
        popularDrink:   form.popularDrink || undefined,
        pastriesSold:   form.pastriesSold !== '' ? Number(form.pastriesSold) : undefined,
        equipmentIssue: form.equipmentIssue,
        equipmentNotes: form.equipmentNotes || undefined,
        complaintFlag:  form.complaintFlag,
        complaintNotes: form.complaintNotes || undefined,
        shiftNotes:     form.shiftNotes || undefined,
      };
      await shiftApi.update(myShift.id, payload);
      await shiftApi.submit(myShift.id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-shift-today'] }),
  });

  if (isLoading) {
    return <p className="text-muted text-sm py-12 text-center">Loading…</p>;
  }

  // Submitted view
  if (myShift?.status === 'submitted') {
    const totalSales = (myShift.cashSales ?? 0) + (myShift.digitalSales ?? 0);
    return (
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="font-bold text-green-800 text-lg">Report Submitted</p>
          <p className="text-green-700 text-sm mt-0.5">
            {myShift.submittedAt ? `Submitted at ${format(new Date(myShift.submittedAt), 'h:mm a')}` : ''}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 grid grid-cols-2 gap-4 text-sm">
          {[
            { label: 'Cash Sales',    value: myShift.cashSales    != null ? `NPR ${Number(myShift.cashSales).toLocaleString()}`    : '—' },
            { label: 'Digital Sales', value: myShift.digitalSales != null ? `NPR ${Number(myShift.digitalSales).toLocaleString()}` : '—' },
            { label: 'Total Sales',   value: `NPR ${totalSales.toLocaleString()}` },
            { label: 'Closing Cash',  value: myShift.closingCash  != null ? `NPR ${Number(myShift.closingCash).toLocaleString()}`  : '—' },
            { label: 'Drinks Served', value: myShift.drinksCount ?? '—' },
            { label: 'Popular Drink', value: myShift.popularDrink ?? '—' },
            { label: 'Pastries Sold', value: myShift.pastriesSold ?? '—' },
            { label: 'Equipment Issue', value: myShift.equipmentIssue ? 'Yes' : 'None' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted font-bold uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
            </div>
          ))}
          {myShift.shiftNotes && (
            <div className="col-span-2">
              <p className="text-xs text-muted font-bold uppercase tracking-wide">Notes</p>
              <p className="text-sm text-gray-700 mt-0.5">{myShift.shiftNotes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No shift yet — show start button
  if (!myShift) {
    return (
      <div className="space-y-6 max-w-lg">
        <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
        <p className="text-muted text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')} · {shiftType === 'am' ? 'Morning' : 'Afternoon'} shift</p>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <p className="font-semibold text-gray-900">No shift started for today.</p>
          <Field label="Opening Float (NPR)">
            <NumInput value={openingFloat} onChange={setOpeningFloat} placeholder="e.g. 500" />
          </Field>
          <button
            onClick={() => startShift()}
            disabled={starting}
            className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {starting ? 'Starting…' : 'Start My Shift'}
          </button>
          {startError && (
            <p className="text-red-500 text-sm">{startError.response?.data?.error ?? 'Failed to start shift'}</p>
          )}
        </div>
      </div>
    );
  }

  // Shift in progress — show report form
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">My Shift</h1>
      <p className="text-muted text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')} · {shiftType === 'am' ? 'Morning' : 'Afternoon'} shift · In Progress</p>

      {/* Sales */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Sales</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Cash Sales (NPR)">
            <NumInput value={form.cashSales} onChange={set('cashSales')} />
          </Field>
          <Field label="Digital Sales (NPR)">
            <NumInput value={form.digitalSales} onChange={set('digitalSales')} />
          </Field>
          <Field label="Closing Cash (NPR)">
            <NumInput value={form.closingCash} onChange={set('closingCash')} />
          </Field>
        </div>
      </section>

      {/* Operations */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Operations</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Drinks Served">
            <NumInput value={form.drinksCount} onChange={set('drinksCount')} />
          </Field>
          <Field label="Pastries Sold">
            <NumInput value={form.pastriesSold} onChange={set('pastriesSold')} />
          </Field>
        </div>
        <Field label="Most Popular Drink">
          <TextInput value={form.popularDrink} onChange={set('popularDrink')} placeholder="e.g. Oat Flat White" />
        </Field>
      </section>

      {/* Issues */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Issues</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.equipmentIssue}
            onChange={(e) => set('equipmentIssue')(e.target.checked)}
            className="w-4 h-4 accent-secondary"
          />
          <span className="text-sm font-medium text-gray-900">Equipment issue occurred</span>
        </label>
        {form.equipmentIssue && (
          <Field label="Equipment Issue Details">
            <Textarea value={form.equipmentNotes} onChange={set('equipmentNotes')} placeholder="Describe the issue…" />
          </Field>
        )}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.complaintFlag}
            onChange={(e) => set('complaintFlag')(e.target.checked)}
            className="w-4 h-4 accent-secondary"
          />
          <span className="text-sm font-medium text-gray-900">Customer complaint received</span>
        </label>
        {form.complaintFlag && (
          <Field label="Complaint Details">
            <Textarea value={form.complaintNotes} onChange={set('complaintNotes')} placeholder="Describe the complaint…" />
          </Field>
        )}
      </section>

      {/* Notes */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="font-bold text-gray-900">Shift Notes</h2>
        <Textarea value={form.shiftNotes} onChange={set('shiftNotes')} placeholder="Anything else to note for the owner…" />
      </section>

      <button
        onClick={() => submitReport()}
        disabled={submitting}
        className="w-full bg-secondary text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Shift Report'}
      </button>
      {submitError && (
        <p className="text-red-500 text-sm">{submitError.response?.data?.error ?? 'Failed to submit report'}</p>
      )}
    </div>
  );
}
