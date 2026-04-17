import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addMonths, subMonths } from 'date-fns';
import { analyticsApi } from '../../lib/api.js';

const TIER_LABEL = {
  daily_pass:    'Daily Pass',
  team_pack:     'Team Pack',
  office_bundle: 'Office Bundle',
};
const TIER_COLOR = {
  daily_pass:    'bg-green-100 text-green-800',
  team_pack:     'bg-yellow-100 text-yellow-800',
  office_bundle: 'bg-purple-100 text-purple-700',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const now = new Date();
  const [lbDate, setLbDate] = useState(() => new Date());
  const lbMonth = lbDate.getMonth() + 1;
  const lbYear  = lbDate.getFullYear();

  const { data: mrr } = useQuery({
    queryKey: ['analytics-mrr'],
    queryFn:  () => analyticsApi.mrr().then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: renewals } = useQuery({
    queryKey: ['analytics-renewals'],
    queryFn:  () => analyticsApi.renewals(60).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: lb } = useQuery({
    queryKey: ['analytics-leaderboard', lbMonth, lbYear],
    queryFn:  () => analyticsApi.leaderboard(lbMonth, lbYear).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black text-gray-900">Analytics</h1>

      {/* MRR */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Monthly Recurring Revenue</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total MRR"
            value={`NPR ${(mrr?.totalMrr ?? 0).toLocaleString()}`}
            sub={`${mrr?.memberCount ?? 0} active memberships`}
          />
          <StatCard
            label="Avg Fee"
            value={`NPR ${Math.round(mrr?.avgFee ?? 0).toLocaleString()}`}
            sub="per active member"
          />
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">By Tier</p>
            <div className="space-y-1">
              {Object.entries(mrr?.byTier ?? {}).map(([tier, rev]) => (
                <div key={tier} className="flex justify-between text-sm">
                  <span className="text-gray-600">{TIER_LABEL[tier] ?? tier}</span>
                  <span className="font-bold text-gray-900">NPR {rev.toLocaleString()}</span>
                </div>
              ))}
              {Object.keys(mrr?.byTier ?? {}).length === 0 && (
                <p className="text-sm text-gray-400">No active memberships</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Renewal Calendar */}
      <section>
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Upcoming Renewals <span className="text-gray-300 font-normal">(next 60 days)</span>
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(renewals?.renewals ?? []).length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No renewals due in the next 60 days.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Company</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Tier</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {renewals.renewals.map((m) => {
                    const overdue = m.daysLeft < 0;
                    const urgent  = m.daysLeft >= 0 && m.daysLeft <= 3;
                    const warning = m.daysLeft > 3  && m.daysLeft <= 7;
                    const badge   = overdue ? 'bg-red-600 text-white'
                      : urgent  ? 'bg-red-100 text-red-700'
                      : warning ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600';
                    const label   = overdue ? `${Math.abs(m.daysLeft)}d overdue`
                      : m.daysLeft === 0 ? 'today'
                      : `${m.daysLeft}d left`;
                    return (
                      <tr key={m.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-sm text-gray-900">{m.companyName}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TIER_COLOR[m.tier] ?? 'bg-gray-100 text-gray-600'}`}>
                            {TIER_LABEL[m.tier] ?? m.tier}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {m.renewalDate ? format(new Date(m.renewalDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-700">{m.monthlyFee != null ? `NPR ${m.monthlyFee.toLocaleString()}` : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Barista Leaderboard */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Barista Leaderboard</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLbDate((d) => subMonths(d, 1))}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded"
            >‹</button>
            <span className="text-sm font-medium text-gray-700">{format(lbDate, 'MMMM yyyy')}</span>
            <button
              onClick={() => setLbDate((d) => addMonths(d, 1))}
              disabled={lbYear === now.getFullYear() && lbMonth === (now.getMonth() + 1)}
              className="text-gray-400 hover:text-gray-700 px-2 py-1 rounded disabled:opacity-30"
            >›</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {(lb?.leaderboard ?? []).length === 0 ? (
            <p className="p-5 text-sm text-gray-400">No submitted shifts for this month.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase w-8">#</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase">Barista</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Drinks</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Shifts</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase text-right">Avg/Shift</th>
                </tr>
              </thead>
              <tbody>
                {lb.leaderboard.map((b, i) => (
                  <tr key={b.userId} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-bold text-gray-300">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-sm text-gray-900">
                      {i === 0 && <span className="mr-1">🏆</span>}
                      {b.name}
                    </td>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">{b.drinks}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-right">{b.shifts}</td>
                    <td className="px-4 py-2 text-sm text-gray-500 text-right">
                      {b.shifts > 0 ? (b.drinks / b.shifts).toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
