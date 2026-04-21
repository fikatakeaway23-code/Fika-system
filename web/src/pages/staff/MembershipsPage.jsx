import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipApi } from '../../lib/api.js';
import { renewalReminderLink, topUpAckLink } from '../../lib/whatsapp.js';

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

function RedeemModal({ membership, onClose, onSuccess }) {
  const [count, setCount]         = useState(1);
  const [drinkType, setDrinkType] = useState('');
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const remaining  = membership.drinksRemaining;
  const afterRedeem = remaining !== null ? remaining - count : null;

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      await membershipApi.redeem(membership.id, {
        count,
        drinkType: drinkType.trim() || undefined,
        notes:     notes.trim()     || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log drink');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Log drink redemption</h3>
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-xs text-gray-500 mb-1">Company</p>
            <p className="text-sm font-medium text-gray-900 bg-gray-50 rounded-lg px-3 py-2">{membership.companyName}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Count</label>
            <select
              value={count}
              onChange={e => setCount(Number(e.target.value))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-primary"
            >
              {[1, 2, 3, 4, 5].map(n => (
                <option key={n} value={n}>{n} drink{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Drink type <span className="text-gray-400">(optional)</span></label>
            <input
              value={drinkType}
              onChange={e => setDrinkType(e.target.value)}
              placeholder="e.g. Americano, Latte, Tea"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Note <span className="text-gray-400">(optional)</span></label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. team meeting"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary"
            />
          </div>
          {remaining !== null && (
            <p className="text-xs text-gray-500">
              Balance after:{' '}
              <span className={`font-semibold ${afterRedeem < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {afterRedeem} drink{afterRedeem !== 1 ? 's' : ''} remaining
              </span>
            </p>
          )}
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={loading || (remaining !== null && count > remaining)}
            className="flex-1 bg-secondary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Logging…' : 'Confirm'}
          </button>
          <button
            onClick={onClose}
            className="px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function UsagePanel({ membershipId, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  React.useEffect(() => {
    membershipApi.getUsage(membershipId, { limit: 30 })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load usage history'))
      .finally(() => setLoading(false));
  }, [membershipId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Usage history</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-12">{error}</p>
        ) : !data?.records?.length ? (
          <p className="text-sm text-gray-500 text-center py-12">No redemptions recorded yet.</p>
        ) : (
          <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Date & time</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Drinks</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">By</th>
                  <th className="text-left py-2 text-xs text-gray-500 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {data.records.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-2.5 text-gray-900 text-xs">
                      {new Date(r.redeemedAt).toLocaleString('en-IN', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 font-medium text-gray-900">{r.count}</td>
                    <td className="py-2.5 text-gray-500">{r.drinkType || '—'}</td>
                    <td className="py-2.5 text-gray-500">{r.redeemedBy?.name || '—'}</td>
                    <td className="py-2.5 text-gray-400 text-xs">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalAccountModal({ membership, onClose }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  const { data: qrData, isLoading: qrLoading, isError: qrError } = useQuery({
    queryKey: ['membership-qr', membership.id],
    queryFn:  () => membershipApi.getQr(membership.id).then((r) => r.data),
    enabled:  !!result,
    staleTime: Infinity,
  });

  async function handleCreate() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await membershipApi.createAccount(membership.id, email.trim());
      setResult(r.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">Portal account</h3>
        <p className="text-xs text-gray-500 mb-4">{membership.companyName}</p>
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-xl px-4 py-4 border border-green-100">
              <p className="text-xs font-bold text-green-800 mb-3 uppercase tracking-wide">Account created</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{result.account.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Temp password <span className="text-gray-400">(shown once)</span></p>
                  <p className="text-lg font-mono font-bold text-gray-900 tracking-widest">{result.tempPassword}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Share with client via WhatsApp. They must change it on first login.</p>
            </div>
            {/* QR Code */}
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-xs text-gray-400">Scan to open member portal</p>
              {qrLoading ? (
                <div className="w-[180px] h-[180px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-gray-400">Loading...</span>
                </div>
              ) : qrError ? (
                <p className="text-xs text-red-500">Could not load QR code.</p>
              ) : qrData?.qrDataUrl ? (
                <>
                  <img
                    src={qrData.qrDataUrl}
                    alt="Member portal QR"
                    className="w-[180px] h-[180px] rounded-lg border border-gray-100"
                  />
                  <button
                    onClick={() => {
                      const safeName = membership.companyName.replace(/[^a-z0-9\-_ ]/gi, '_');
                      fetch(qrData.qrDataUrl)
                        .then(r => r.blob())
                        .then(blob => {
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `fika-qr-${safeName}.png`;
                          a.click();
                          URL.revokeObjectURL(url);
                        });
                    }}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Download QR
                  </button>
                </>
              ) : null}
            </div>
            <button onClick={onClose} className="w-full text-sm font-semibold text-gray-700 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@company.com"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary"
              />
            </div>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={loading || !email.trim()}
                className="flex-1 bg-secondary text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 hover:bg-secondary/90"
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
              <button onClick={onClose} className="px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
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

  const { data: topUpData } = useQuery({
    queryKey:        ['topup-requests-memberships'],
    queryFn:         () => membershipApi.getTopUpRequests('pending').then((r) => r.data),
    staleTime:       30_000,
    refetchInterval: 60_000,
  });
  const pendingRequests = topUpData?.requests ?? [];

  const ackTopUp = useMutation({
    mutationFn: ({ requestId, status }) => membershipApi.updateTopUpRequest(requestId, status),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['topup-requests-memberships'] });
      qc.invalidateQueries({ queryKey: ['topup-pending-count'] });
    },
  });

  function handleAdd(e) {
    e.preventDefault();
    if (!addForm.companyName.trim()) { setAddError('Company name required.'); return; }
    addMember({ ...addForm, staffCount: parseInt(addForm.staffCount) || undefined, monthlyFee: parseFloat(addForm.monthlyFee) || undefined, status: 'active' });
  }

  const [redeemTarget, setRedeemTarget] = useState(null);
  const [usageTarget,  setUsageTarget]  = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const [showOverdue, setShowOverdue] = useState(false);

  const active  = memberships?.filter((m) => m.status === 'active')  ?? [];
  const others  = memberships?.filter((m) => m.status !== 'active')  ?? [];
  const selMem  = memberships?.find((m) => m.id === selected);
  const overdueList = (memberships ?? []).filter(
    (m) => m.status === 'active' && m.renewalDate && new Date(m.renewalDate) < new Date()
  );
  const displayed = showOverdue ? overdueList : [...active, ...others];

  function daysUntilRenewal(renewalDate) {
    if (!renewalDate) return null;
    const diff = new Date(renewalDate) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-gray-900">Memberships</h1>
          <button
            onClick={() => setShowOverdue((v) => !v)}
            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
              showOverdue
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-500 border-gray-200 hover:border-red-400 hover:text-red-600'
            }`}
          >
            {showOverdue ? `Overdue (${overdueList.length})` : 'Overdue'}
          </button>
        </div>
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

      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-amber-800">
              {pendingRequests.length} Pending Top-up Request{pendingRequests.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-xl border border-amber-100 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{req.membership.companyName}</p>
                  {req.message && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.message}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(req.requestedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {req.membership.drinksRemaining != null && ` · ${req.membership.drinksRemaining} drinks remaining`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => ackTopUp.mutate({ requestId: req.id, status: 'acknowledged' })}
                    disabled={ackTopUp.isPending}
                    className="px-3 py-1.5 text-xs font-bold border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                  >
                    Acknowledge
                  </button>
                  <button
                    onClick={() => ackTopUp.mutate({ requestId: req.id, status: 'fulfilled' })}
                    disabled={ackTopUp.isPending}
                    className="px-3 py-1.5 text-xs font-bold bg-secondary text-white rounded-lg hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    Fulfilled ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
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
                {displayed.map((m) => (
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
            {(() => {
              const days = daysUntilRenewal(selMem.renewalDate);
              if (days !== null && days <= 7 && days >= 0) {
                return (
                  <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                    days <= 3
                      ? 'bg-red-50 text-red-700 border border-red-100'
                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                  }`}>
                    Renewal in {days} day{days !== 1 ? 's' : ''} · NPR {Number(selMem.monthlyFee).toLocaleString()}/mo
                  </div>
                );
              }
              return null;
            })()}
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
                <span className="font-bold text-gray-900">
                  {selMem.drinksUsed ?? 0}
                  {selMem.drinksRemaining != null
                    ? ` / ${(selMem.drinksUsed ?? 0) + selMem.drinksRemaining}`
                    : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: selMem.drinksRemaining != null
                      ? `${Math.min(((selMem.drinksUsed ?? 0) / ((selMem.drinksUsed ?? 0) + selMem.drinksRemaining)) * 100, 100)}%`
                      : `${Math.min(((selMem.drinksUsed ?? 0) / (ALLOTMENT[selMem.tier] ?? 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              {selMem.drinksRemaining != null && (
                <p className="text-xs text-muted mt-1">{selMem.drinksRemaining} remaining</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setRedeemTarget(selMem)}
                className="flex-1 py-2 bg-secondary text-white rounded-xl text-sm font-bold hover:bg-secondary/90 transition-colors"
              >
                Log drink
              </button>
              <button
                onClick={() => setUsageTarget(selMem.id)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
              >
                Usage
              </button>
              <button
                onClick={() => setPortalTarget(selMem)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-bold text-muted hover:bg-gray-50 transition-colors"
              >
                Portal
              </button>
            </div>

            {/* WhatsApp quick actions */}
            {selMem.whatsapp && (
              <div className="flex gap-2">
                <a
                  href={renewalReminderLink({
                    phone:       selMem.whatsapp,
                    companyName: selMem.companyName,
                    monthlyFee:  selMem.monthlyFee,
                    renewalDate: selMem.renewalDate,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Send renewal reminder on WhatsApp"
                  className="flex-1 py-2 border border-green-200 rounded-xl text-xs font-bold text-green-700 hover:bg-green-50 transition-colors text-center"
                >
                  📲 Renewal
                </a>
                <a
                  href={topUpAckLink({ phone: selMem.whatsapp, companyName: selMem.companyName })}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Send top-up acknowledgement on WhatsApp"
                  className="flex-1 py-2 border border-green-200 rounded-xl text-xs font-bold text-green-700 hover:bg-green-50 transition-colors text-center"
                >
                  📲 Top-up
                </a>
              </div>
            )}

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

      {redeemTarget && (
        <RedeemModal
          membership={redeemTarget}
          onClose={() => setRedeemTarget(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['memberships-web'] })}
        />
      )}
      {usageTarget && (
        <UsagePanel
          membershipId={usageTarget}
          onClose={() => setUsageTarget(null)}
        />
      )}
      {portalTarget && (
        <PortalAccountModal
          membership={portalTarget}
          onClose={() => setPortalTarget(null)}
        />
      )}
    </div>
  );
}
