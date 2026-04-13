import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { reportApi, financeApi, shiftApi } from '../../lib/api.js';
import { getUser, isOwner } from '../../lib/auth.js';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function StatCard({ label, value, sub, accent, linkTo }) {
  const card = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow ${accent ? 'border-l-4 border-l-secondary' : ''}`}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${accent ? 'text-secondary' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
  return linkTo ? <Link to={linkTo}>{card}</Link> : card;
}

export function OverviewPage() {
  const user  = getUser();
  const owner = isOwner();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: weekly } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: () => reportApi.weekly().then((r) => r.data),
    staleTime: 120_000,
  });

  const { data: discrepancies } = useQuery({
    queryKey: ['discrepancies'],
    queryFn: () => financeApi.getDiscrepancies().then((r) => r.data),
    staleTime: 120_000,
    enabled: owner,
  });

  const { data: recentShifts } = useQuery({
    queryKey: ['recent-shifts-web'],
    queryFn: () => shiftApi.getAll({ limit: 5 }).then((r) => r.data),
    staleTime: 60_000,
  });

  const todayData  = weekly?.days?.find((d) => d.date === today);
  const todaySales = todayData?.revenue    ?? 0;
  const todayDrinks = todayData?.drinksCount ?? 0;
  const weekTotal  = weekly?.summary?.totalRevenue ?? 0;
  const chartData  = weekly?.days?.map((d) => ({
    day:     format(new Date(d.date), 'EEE'),
    revenue: d.revenue ?? 0,
    drinks:  d.drinksCount ?? 0,
  })) ?? [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{greeting}, {user?.name ?? 'there'} 👋</h1>
          <p className="text-muted text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
      </div>

      {/* Discrepancy alert */}
      {owner && discrepancies?.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-red-700">{discrepancies.length} cash discrepanc{discrepancies.length === 1 ? 'y' : 'ies'} detected</p>
            <p className="text-sm text-red-600">Review in the Finance tab.</p>
          </div>
          <Link to="/staff/finance" className="ml-auto text-sm font-bold text-red-700 hover:underline">Review →</Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales"  value={`NPR ${todaySales.toLocaleString()}`}  sub="POS total"      accent  linkTo="/staff/finance" />
        <StatCard label="Drinks Today"   value={String(todayDrinks)}                    sub="served"                 linkTo="/staff/shifts" />
        <StatCard label="This Week"      value={`NPR ${weekTotal.toLocaleString()}`}    sub="total revenue"          linkTo="/staff/reports" />
        <StatCard label="Shifts (week)"  value={String(weekly?.days?.filter((d) => (d.shiftsCompleted ?? 0) > 0).length ?? 0)} sub="with activity" linkTo="/staff/shifts" />
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Weekly Revenue (NPR)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6BCB77" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6BCB77" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#718096' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#718096' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`NPR ${v.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <Area type="monotone" dataKey="revenue" stroke="#6BCB77" strokeWidth={2} fill="url(#colorRevenue)" dot={{ fill: '#6BCB77', r: 3 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent shifts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Shifts</h2>
          <Link to="/staff/shifts" className="text-sm text-secondary font-semibold hover:underline">View all →</Link>
        </div>
        {!recentShifts?.length ? (
          <p className="text-muted text-sm py-4 text-center">No shifts recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentShifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{format(new Date(shift.date), 'EEE d MMM')}</p>
                  <p className="text-xs text-muted">{shift.shiftType === 'am' ? 'Morning' : 'Afternoon'} · {shift.user?.name ?? (shift.shiftType === 'am' ? 'Barista 1' : 'Barista 2')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {shift.drinksCount != null && <span className="text-xs text-muted">{shift.drinksCount} drinks</span>}
                  <StatusBadge status={shift.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted:   'bg-green-100 text-green-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    reviewed:    'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
