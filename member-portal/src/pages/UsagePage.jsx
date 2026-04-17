import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

export function UsagePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [page,  setPage]  = useState(1);

  const { data, isLoading } = useQuery({
    queryKey:  ['member-usage', month, year, page],
    queryFn:   () => memberApi.getUsage({ month, year, page }).then(r => r.data),
    staleTime: 30_000,
  });

  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({
      label: d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
      month: d.getMonth() + 1,
      year:  d.getFullYear(),
    });
  }

  function handleMonthChange(e) {
    const [m, y] = e.target.value.split('-').map(Number);
    setMonth(m); setYear(y); setPage(1);
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Usage log</h1>
        <select
          value={`${month}-${year}`}
          onChange={handleMonthChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-primary"
        >
          {monthOptions.map(o => (
            <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-12">Loading…</p>
        ) : !data?.records?.length ? (
          <p className="text-sm text-gray-400 text-center py-12">No redemptions in this period.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Time</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Drinks</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold hidden sm:table-cell">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.records.map(r => {
                  const dt = new Date(r.redeemedAt);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900">{dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
                      <td className="px-4 py-3 text-gray-500">{dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{r.count}</td>
                      <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{r.drinkType || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.pages > 1 && (
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs font-medium text-gray-500 disabled:opacity-30 hover:text-gray-900">← Previous</button>
                <span className="text-xs text-gray-400">Page {page} of {data.pages}</span>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages} className="text-xs font-medium text-gray-500 disabled:opacity-30 hover:text-gray-900">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <p className="text-xs text-gray-400 text-center">
          {data.total} total redemption{data.total !== 1 ? 's' : ''} in this period
        </p>
      )}
    </div>
  );
}
