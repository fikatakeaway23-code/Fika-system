import React, { useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeApi } from '../../lib/api.js';

function Field({ label, value, onChange, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</label>
      {hint && <p className="text-xs text-muted mb-1">{hint}</p>}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
        />
        <span className="text-xs text-muted">NPR</span>
      </div>
    </div>
  );
}

function DiscRow({ rec }) {
  const disc = Number(rec.cashDiscrepancy ?? 0);
  const isShort = disc < 0;
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="font-semibold text-sm text-gray-900">{format(new Date(rec.date), 'EEE d MMM yyyy')}</p>
        <p className="text-xs text-muted">POS Cash: NPR {Number(rec.posCash ?? 0).toLocaleString()} · Reported: NPR {Number(rec.baristaCashReported ?? 0).toLocaleString()}</p>
      </div>
      <span className={`text-sm font-extrabold ${isShort ? 'text-danger' : 'text-yellow-600'}`}>
        {disc >= 0 ? '+' : ''}{disc.toLocaleString()} NPR
      </span>
    </div>
  );
}

export function FinancePage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const qc    = useQueryClient();

  const [form, setForm] = useState({ posTotal: '', posCash: '', posDigital: '', baristaCashReported: '', baristaDigitalReported: '' });
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const update = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };

  useQuery({
    queryKey: ['finance-today-web', today],
    queryFn: () => financeApi.getByDate(today).then((r) => r.data),
    onSuccess: (rec) => {
      if (rec) setForm({
        posTotal:               String(rec.posTotal               ?? ''),
        posCash:                String(rec.posCash                ?? ''),
        posDigital:             String(rec.posDigital             ?? ''),
        baristaCashReported:    String(rec.baristaCashReported    ?? ''),
        baristaDigitalReported: String(rec.baristaDigitalReported ?? ''),
      });
    },
  });

  const { data: discrepancies } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => financeApi.getDiscrepancies().then((r) => r.data),
    staleTime: 120_000,
  });

  const { mutate: saveFinance, isPending } = useMutation({
    mutationFn: (payload) => financeApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discrepancies'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => setError(err?.response?.data?.message ?? 'Failed to save.'),
  });

  function handleSave(e) {
    e.preventDefault();
    const posTotal = parseFloat(form.posTotal);
    const posCash  = parseFloat(form.posCash);
    if (isNaN(posTotal) || isNaN(posCash)) { setError('POS Total and POS Cash are required.'); return; }
    saveFinance({
      date: today, posTotal, posCash,
      posDigital:             parseFloat(form.posDigital)             || 0,
      baristaCashReported:    parseFloat(form.baristaCashReported)    || 0,
      baristaDigitalReported: parseFloat(form.baristaDigitalReported) || 0,
    });
  }

  const posCash = parseFloat(form.posCash) || 0;
  const barCash = parseFloat(form.baristaCashReported) || 0;
  const diff    = barCash - posCash;
  const showDisc = Math.abs(diff) > 50 && posCash > 0 && barCash > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-gray-900">Finance</h1>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Entry form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-1">Today's Finance Entry</h2>
          <p className="text-xs text-muted mb-4">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

          {saved && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-semibold">✓ Finance record saved.</div>}
          {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger font-semibold">{error}</div>}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">POS System</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Total"   value={form.posTotal}   onChange={update('posTotal')}   hint="Required" />
                <Field label="Cash"    value={form.posCash}    onChange={update('posCash')}    hint="Required" />
                <Field label="Digital" value={form.posDigital} onChange={update('posDigital')} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Barista Reported</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cash Collected"    value={form.baristaCashReported}    onChange={update('baristaCashReported')} />
                <Field label="Digital Confirmed" value={form.baristaDigitalReported} onChange={update('baristaDigitalReported')} />
              </div>
            </div>

            {/* Preview */}
            {(posCash > 0 || barCash > 0) && (
              <div className="bg-surface rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted">POS Cash</span><span className="font-semibold">NPR {posCash.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-muted">Reported Cash</span><span className="font-semibold">NPR {barCash.toLocaleString()}</span></div>
                <div className={`flex justify-between pt-1 border-t border-gray-200 ${showDisc ? 'text-danger' : 'text-muted'}`}>
                  <span className="font-bold">Difference</span>
                  <span className="font-extrabold">NPR {diff >= 0 ? '+' : ''}{diff.toLocaleString()}</span>
                </div>
              </div>
            )}

            {showDisc && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-danger">
                ⚠️ Discrepancy of NPR {Math.abs(diff).toLocaleString()} will be flagged.
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save Finance Record'}
            </button>
          </form>
        </div>

        {/* Discrepancies */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">
            Cash Discrepancies
            {discrepancies?.length > 0 && (
              <span className="ml-2 text-xs font-bold bg-red-100 text-danger px-2 py-0.5 rounded-full">{discrepancies.length}</span>
            )}
          </h2>
          {!discrepancies?.length ? (
            <p className="text-muted text-sm py-6 text-center">No discrepancies — all clear! ✓</p>
          ) : (
            discrepancies.map((rec) => <DiscRow key={rec.id} rec={rec} />)
          )}
        </div>
      </div>
    </div>
  );
}
