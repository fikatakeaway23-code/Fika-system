import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { memberApi } from '../lib/api.js';

export function ChartPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey:  ['member-chart', month, year],
    queryFn:   () => memberApi.getUsageChart({ month, year }).then(r => r.data),
    staleTime: 60_000,
  });

  const monthOptions = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({ label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }), month: d.getMonth() + 1, year: d.getFullYear() });
  }

  function handleMonthChange(e) {
    const [m, y] = e.target.value.split('-').map(Number);
    setMonth(m); setYear(y);
  }

  const totalDrinks = data?.data?.reduce((sum, d) => sum + d.drinks, 0) ?? 0;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Monthly chart</h1>
        <select value={`${month}-${year}`} onChange={handleMonthChange} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-primary">
          {monthOptions.map(o => (
            <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {isLoading ? (
          <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Loading…</div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">Drinks per day</p>
              <p className="text-sm font-bold text-gray-900">{totalDrinks} total</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.data ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ border: '0.5px solid #E5E7EB', borderRadius: '8px', fontSize: 12 }}
                  formatter={(v) => [`${v} drink${v !== 1 ? 's' : ''}`, 'Used']}
                  labelFormatter={(day) => `Day ${day}`}
                />
                <Bar dataKey="drinks" fill="#1D9E75" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
