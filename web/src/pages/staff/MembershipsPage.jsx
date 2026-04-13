import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../../lib/api.js';

const TIERS   = ['individual', 'team', 'corporate', 'enterprise'];
const ALLOTMENT = { individual: 20, team: 50, corporate: 100, enterprise: 200 };
const TIER_COLORS = { individual: '#6BCB77', team: '#F59E0B', corporate: '#2D6A4F', enterprise: '#7C3AED' };

function TierBadge({ tier }) {
  const color = TIER_COLORS[tier] ?? '#718096';
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full border" style={{ color, borderColor: color + '60', backgroundColor: color + '15' }}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = { active: 'bg-green-100 text-green-800', pending: 'bg-yellow-100 text-yellow-800', expired: 'bg-gray-100 text-gray-600', cancelled: 'bg-red-100 text-red-700' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function DrinkBar({ used, tier }) {
  const total = ALLOTMENT[tier] ?? 0;
  const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const color = pct > 90 ? '#EF4444' : '#6BCB77';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-muted">{used}/{total}</span>
    </div>
  );
}

export function MembershipsPage() {
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ companyName: '', contactPerson: '', whatsapp: '', tier: 'team', staffCount: '', monthlyFee: '', renewalDate: '' });
  const [addError, setAddError] = useState('');
  const qc = useQueryClient();

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships-web'],
    queryFn: () => membershipApi.getAll().then((r) => r.data),
    staleTime: 60_000,
  });

  const { mutate: addMember, isPending: isAdding } = useMutation({
    mutationFn: (data) => membershipApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['memberships-web'] }); setShowAdd(false); setAddError(''); },
    onError: (err) => setAddError(err?.response?.data?.message ?? 'Failed.'),
  });

  const { mutate: addDrink } = useMutation({
    mutationFn: ({ id, delta }) => membershipApi.addDrink(id, delta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships-web'] }),
  });

  const { mutate: updateMember } = useMutation({
    mutationFn: ({ id, data }) => membershipApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships-web'] }),
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!addForm.companyName.trim()) { setAddError('Company name required.'); return; }
    addMember({ ...addForm, staffCount: parseInt(addForm.staffCount) || undefined, monthlyFee: parseFloat(addForm.monthlyFee) || undefined, status: 'active' });
  }

  const active  = memberships?.filter((m) => m.status === 'active')  ?? [];
  const others  = memberships?.filter((m) => m.status !== 'active')  ?? [];
  const selMem  = memberships?.find((m) => m.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Memberships</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 bg-secondary text-white text-sm font-bold rounded-xl hover:bg-secondary/90 transition-colors">
          {showAdd ? '✕ Cancel' : '+ Add Membership'}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">New Membership</h2>
          {addError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">{addError}</div>}
          <form onSubmit={handleAdd} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'companyName',   label: 'Company Name *', placeholder: 'e.g. Kathmandu Corp' },
              { key: 'contactPerson', label: 'Contact Person',  placeholder: 'Full name' },
              { key: 'whatsapp',      label: 'WhatsApp',        placeholder: '+977 98XXXXXXXX' },
              { key: 'monthlyFee',    label: 'Monthly Fee (NPR)', placeholder: '0' },
              { key: 'staffCount',    label: 'Staff Count',     placeholder: '0' },
              { key: 'renewalDate',   label: 'Renewal Date',    placeholder: 'YYYY-MM-DD' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</label>
                <input value={addForm[key]} onChange={(e) => setAddForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">Tier</label>
              <select value={addForm.tier} onChange={(e) => setAddForm((f) => ({ ...f, tier: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary bg-white">
                {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" disabled={isAdding} className="px-6 py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 disabled:opacity-50">
                {isAdding ? 'Saving…' : 'Create Membership'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <p className="text-muted text-sm text-center py-12">Loading…</p>
          ) : !memberships?.length ? (
            <p className="text-muted text-sm text-center py-12">No memberships yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden md:table-cell">Drinks</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...active, ...others].map((m) => (
                  <tr key={m.id} className={`hover:bg-surface cursor-pointer transition-colors ${selected === m.id ? 'bg-primary/5' : ''}`} onClick={() => setSelected(m.id === selected ? null : m.id)}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{m.companyName}</p>
                      {m.contactPerson && <p className="text-xs text-muted">{m.contactPerson}</p>}
                    </td>
                    <td className="px-4 py-3"><TierBadge tier={m.tier} /></td>
                    <td className="px-4 py-3 hidden md:table-cell w-36"><DrinkBar used={m.drinksUsed ?? 0} tier={m.tier} /></td>
                    <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selMem ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selMem.companyName}</h3>
                <p className="text-xs text-muted">{selMem.contactPerson}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-gray-900 text-sm">✕</button>
            </div>

            {/* Drinks usage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Drinks used</span>
                <span className="font-bold text-gray-900">{selMem.drinksUsed ?? 0} / {ALLOTMENT[selMem.tier] ?? 0}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(((selMem.drinksUsed ?? 0) / (ALLOTMENT[selMem.tier] ?? 1)) * 100, 100)}%` }} />
              </div>
            </div>

            {/* +/- buttons */}
            <div className="flex gap-2">
              <button onClick={() => addDrink({ id: selMem.id, delta: -1 })} disabled={(selMem.drinksUsed ?? 0) <= 0} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 disabled:opacity-30">− Drink</button>
              <button onClick={() => addDrink({ id: selMem.id, delta: 1 })} className="flex-1 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary-dark">+ Drink</button>
            </div>

            {/* Info */}
            {[
              { label: 'WhatsApp',     value: selMem.whatsapp },
              { label: 'Monthly Fee',  value: selMem.monthlyFee != null ? `NPR ${Number(selMem.monthlyFee).toLocaleString()}` : '—' },
              { label: 'Staff Count',  value: selMem.staffCount },
              { label: 'Renewal Date', value: selMem.renewalDate },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm border-t border-gray-50 pt-2">
                <span className="text-muted">{label}</span>
                <span className="font-semibold text-gray-900">{value ?? '—'}</span>
              </div>
            ))}

            {/* Status toggle */}
            <div className="flex gap-2 pt-2">
              {['active', 'expired', 'cancelled'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateMember({ id: selMem.id, data: { status: s } })}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-colors ${selMem.status === s ? 'bg-secondary text-white border-secondary' : 'border-gray-200 text-muted hover:bg-gray-50'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-dashed border-gray-200 p-8 flex items-center justify-center text-center">
            <p className="text-muted text-sm">Select a membership to view details and manage drinks.</p>
          </div>
        )}
      </div>
    </div>
  );
}
