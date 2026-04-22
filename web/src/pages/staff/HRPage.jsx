import React, { useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrApi } from '../../lib/api.js';
import { isOwner, getUser } from '../../lib/auth.js';

const TABS = [
  { value: 'attendance', label: 'Attendance' },
  { value: 'leave',      label: 'Leave' },
  { value: 'incident',   label: 'Incidents' },
  { value: 'salary',     label: 'Salary' },
];

const STAFF = [
  { value: 'barista_am', label: 'Barista 1' },
  { value: 'barista_pm', label: 'Barista 2' },
];

const LEAVE_TYPES    = ['sick', 'personal', 'annual', 'unpaid', 'other'];
const INCIDENT_TYPES = ['late', 'no_show', 'misconduct', 'complaint', 'praise', 'other'];

const EMPTY = {
  attendance: { staffMemberId: 'barista_am', date: format(new Date(), 'yyyy-MM-dd'), arrivalTime: '', lateMinutes: '', overtimeMinutes: '', absent: false, notes: '' },
  leave:      { staffMemberId: 'barista_am', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '', leaveType: 'sick', approvedByOwner: true, notes: '' },
  incident:   { staffMemberId: 'barista_am', date: format(new Date(), 'yyyy-MM-dd'), incidentType: 'late', description: '', actionTaken: '' },
  salary:     { staffMemberId: 'barista_am', month: new Date().getMonth() + 1, year: new Date().getFullYear(), baseSalary: '', bonusAmount: '', deductions: '', paymentDate: '' },
};

function RecordRow({ rec, type }) {
  const staff = STAFF.find((s) => s.value === rec.staffMemberId)?.label ?? rec.staffMemberId;
  let summary = '';
  if (type === 'attendance') summary = `${rec.absent ? 'Absent' : rec.arrivalTime ? `Arrived ${rec.arrivalTime}` : 'Present'}${rec.lateMinutes ? ` · ${rec.lateMinutes}m late` : ''}`;
  if (type === 'leave')      summary = `${rec.leaveType} · ${rec.startDate}${rec.endDate ? ` – ${rec.endDate}` : ''}`;
  if (type === 'incident')   summary = `${rec.incidentType} · ${(rec.description ?? '').slice(0, 60)}`;
  if (type === 'salary') {
    const net = (Number(rec.baseSalary ?? 0) + Number(rec.bonusAmount ?? 0) - Number(rec.deductions ?? 0));
    summary = `Month ${rec.month}/${rec.year} · Net NPR ${net.toLocaleString()}`;
  }
  return (
    <div className="flex justify-between items-start py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="font-semibold text-sm text-gray-900">{staff}</p>
        <p className="text-xs text-muted mt-0.5">{summary}</p>
        {rec.notes && <p className="text-xs text-muted italic mt-0.5">{rec.notes}</p>}
      </div>
      {type === 'attendance' && <span className="text-xs font-bold text-muted">{rec.date}</span>}
    </div>
  );
}

export function HRPage() {
  const owner = isOwner();
  const user  = getUser();
  const visibleTabs = owner ? TABS : TABS.filter((t) => t.value === 'leave');
  const defaultTab  = owner ? 'attendance' : 'leave';

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [form, setForm]           = useState({ ...EMPTY[defaultTab] });
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);
  const qc = useQueryClient();

  // Reset form when tab changes
  React.useEffect(() => { setForm({ ...EMPTY[activeTab] }); setError(''); }, [activeTab]);

  const { data, isLoading } = useQuery({
    queryKey: ['hr-web', activeTab],
    queryFn: () => hrApi.getAll({ type: activeTab }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: logRecord, isPending } = useMutation({
    mutationFn: (payload) => hrApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-web', activeTab] });
      setForm({ ...EMPTY[activeTab] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: (err) => setError(err?.response?.data?.message ?? 'Failed to save.'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, type: activeTab };
    if (activeTab === 'attendance') {
      if (form.lateMinutes)     payload.lateMinutes     = parseInt(form.lateMinutes);
      if (form.overtimeMinutes) payload.overtimeMinutes = parseInt(form.overtimeMinutes);
    }
    if (activeTab === 'salary') {
      payload.baseSalary  = parseFloat(form.baseSalary)  || 0;
      payload.bonusAmount = parseFloat(form.bonusAmount) || 0;
      payload.deductions  = parseFloat(form.deductions)  || 0;
    }
    logRecord(payload);
    setError('');
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => set(k)(e.target.value);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-gray-900">HR Records</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {visibleTabs.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === value ? 'border-primary text-secondary' : 'border-transparent text-muted hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Log form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Log {visibleTabs.find((t) => t.value === activeTab)?.label}</h2>

          {saved && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-semibold">✓ Record saved.</div>}
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Staff selector — owner only */}
            {owner && (
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Staff Member</label>
                <select value={form.staffMemberId} onChange={setE('staffMemberId')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                  {STAFF.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            )}

            {/* Attendance */}
            {activeTab === 'attendance' && (
              <>
                <F label="Date" value={form.date} onChange={setE('date')} placeholder="YYYY-MM-DD" />
                <F label="Arrival Time" value={form.arrivalTime} onChange={setE('arrivalTime')} placeholder="06:05" />
                <F label="Late (min)" value={form.lateMinutes} onChange={setE('lateMinutes')} type="number" />
                <F label="Overtime (min)" value={form.overtimeMinutes} onChange={setE('overtimeMinutes')} type="number" />
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.absent} onChange={(e) => set('absent')(e.target.checked)} className="accent-primary" />
                  Absent
                </label>
                <F label="Notes" value={form.notes} onChange={setE('notes')} textarea />
              </>
            )}

            {/* Leave */}
            {activeTab === 'leave' && (
              <>
                <F label="Start Date" value={form.startDate} onChange={setE('startDate')} placeholder="YYYY-MM-DD" />
                <F label="End Date"   value={form.endDate}   onChange={setE('endDate')}   placeholder="YYYY-MM-DD" />
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Leave Type</label>
                  <select value={form.leaveType} onChange={setE('leaveType')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary">
                    {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.approvedByOwner} onChange={(e) => set('approvedByOwner')(e.target.checked)} className="accent-primary" />
                  Approved by owner
                </label>
                <F label="Notes" value={form.notes} onChange={setE('notes')} textarea />
              </>
            )}

            {/* Incident */}
            {activeTab === 'incident' && (
              <>
                <F label="Date" value={form.date} onChange={setE('date')} placeholder="YYYY-MM-DD" />
                <div>
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Type</label>
                  <select value={form.incidentType} onChange={setE('incidentType')} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary">
                    {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <F label="Description"  value={form.description}  onChange={setE('description')}  textarea />
                <F label="Action Taken" value={form.actionTaken}  onChange={setE('actionTaken')}  textarea />
              </>
            )}

            {/* Salary */}
            {activeTab === 'salary' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <F label="Month" value={String(form.month)} onChange={(e) => set('month')(parseInt(e.target.value) || 1)} type="number" />
                  <F label="Year"  value={String(form.year)}  onChange={(e) => set('year')(parseInt(e.target.value) || 2025)}  type="number" />
                </div>
                <F label="Base Salary (NPR)"  value={form.baseSalary}  onChange={setE('baseSalary')}  type="number" />
                <F label="Bonus (NPR)"         value={form.bonusAmount} onChange={setE('bonusAmount')} type="number" />
                <F label="Deductions (NPR)"    value={form.deductions}  onChange={setE('deductions')}  type="number" />
                <F label="Payment Date (YYYY-MM-DD)" value={form.paymentDate} onChange={setE('paymentDate')} />
              </>
            )}

            <button type="submit" disabled={isPending} className="w-full py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50">
              {isPending ? 'Saving…' : 'Log Record'}
            </button>
          </form>
        </div>

        {/* Records list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">{visibleTabs.find((t) => t.value === activeTab)?.label} Records</h2>
          {isLoading ? (
            <p className="text-muted text-sm text-center py-8">Loading…</p>
          ) : !data?.length ? (
            <p className="text-muted text-sm text-center py-8">No {activeTab} records yet.</p>
          ) : (
            data.map((rec) => <RecordRow key={rec.id} rec={rec} type={activeTab} />)
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type, textarea }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={onChange} placeholder={placeholder} rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none" />
      ) : (
        <input type={type ?? 'text'} value={value} onChange={onChange} placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
      )}
    </div>
  );
}
