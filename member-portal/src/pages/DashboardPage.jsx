import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { memberApi } from '../lib/api.js';
import { BalanceGauge } from '../components/BalanceGauge.jsx';

const TIER_LABELS = {
  daily_pass:    'Fika Pass',
  team_pack:     'Fika Plus',
  office_bundle: 'Fika Gold',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey:  ['member-dashboard'],
    queryFn:   () => memberApi.getDashboard().then(r => r.data),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;
  if (error)     return <div className="text-red-500 text-sm p-4">Failed to load dashboard.</div>;

  const { membership, usedThisMonth, avgPerDay } = data;
  const total = (membership.drinksRemaining ?? 0) + (membership.drinksUsed ?? 0);

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{membership.companyName}</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-gray-500">{TIER_LABELS[membership.tier] ?? membership.tier}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
            membership.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>{membership.status}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <BalanceGauge
          remaining={membership.drinksRemaining ?? 0}
          total={total}
          renewalDate={membership.renewalDate}
          rolloverDrinks={membership.rolloverDrinks}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Used this month',       value: usedThisMonth },
          { label: 'Avg / working day',     value: avgPerDay },
          { label: 'Consecutive renewals',  value: membership.consecutiveRenewals },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {membership.paymentStatus && membership.paymentStatus !== 'paid' && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
          Payment status: <span className="capitalize">{membership.paymentStatus}</span> — please contact Fika.
        </div>
      )}

      {membership.loyaltyDiscountActive && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-sm text-primary font-medium">
          Loyalty member — {membership.consecutiveRenewals} consecutive renewals
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/usage')}
          className="flex-1 border border-gray-200 text-sm font-medium text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
        >
          View usage log
        </button>
        <button
          onClick={() => navigate('/topup')}
          className="flex-1 bg-primary text-white text-sm font-medium py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
        >
          Request top-up
        </button>
      </div>
    </div>
  );
}
