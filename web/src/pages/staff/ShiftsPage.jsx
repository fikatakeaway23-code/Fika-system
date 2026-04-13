import React, { useState } from 'react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { shiftApi } from '../../lib/api.js';

const FILTERS = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
];

function getRange(filter) {
  const now   = new Date();
  const today = format(now, 'yyyy-MM-dd');
  if (filter === 'today') return { from: today, to: today };
  if (filter === 'week')  return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: today };
  return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today };
}

function StatusBadge({ status }) {
  const map = { submitted: 'bg-green-100 text-green-800', in_progress: 'bg-yellow-100 text-yellow-800', reviewed: 'bg-blue-100 text-blue-800' };
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-700'}`}>{status?.replace('_', ' ')}</span>;
}

function ShiftTypeBadge({ type }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${type === 'am' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
      {type === 'am' ? 'AM' : 'PM'}
    </span>
  );
}

export function ShiftsPage() {
  const [filter, setFilter]   = useState('week');
  const [expanded, setExpanded] = useState(null);

  const range = getRange(filter);
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts-web', filter],
    queryFn: () => shiftApi.getAll({ from: range.from, to: range.to }).then((r) => r.data),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-gray-900">Shifts</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              filter === f.value ? 'bg-primary text-white shadow-sm' : 'bg-white border border-gray-200 text-muted hover:text-gray-900'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <p className="text-muted text-sm text-center py-12">Loading…</p>
        ) : !shifts?.length ? (
          <p className="text-muted text-sm text-center py-12">No shifts in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Shift</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden md:table-cell">Barista</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden md:table-cell">Drinks</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider hidden lg:table-cell">Popular</th>
                <th className="text-right px-4 py-3 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shifts.map((shift) => (
                <React.Fragment key={shift.id}>
                  <tr
                    className="hover:bg-surface cursor-pointer transition-colors"
                    onClick={() => setExpanded(expanded === shift.id ? null : shift.id)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">{format(new Date(shift.date), 'EEE d MMM')}</td>
                    <td className="px-4 py-3"><ShiftTypeBadge type={shift.shiftType} /></td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{shift.user?.name ?? (shift.shiftType === 'am' ? 'Barista 1' : 'Barista 2')}</td>
                    <td className="px-4 py-3 text-right text-muted hidden md:table-cell">{shift.drinksCount ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-muted text-xs hidden lg:table-cell">{shift.popularDrink ?? '—'}</td>
                    <td className="px-4 py-3 text-right"><StatusBadge status={shift.status} /></td>
                  </tr>
                  {expanded === shift.id && (
                    <tr className="bg-surface">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {[
                            { label: 'Opening Float', value: shift.openingFloat != null ? `NPR ${Number(shift.openingFloat).toLocaleString()}` : '—' },
                            { label: 'Cash Sales',    value: shift.cashSales    != null ? `NPR ${Number(shift.cashSales).toLocaleString()}`    : '—' },
                            { label: 'Digital Sales', value: shift.digitalSales != null ? `NPR ${Number(shift.digitalSales).toLocaleString()}` : '—' },
                            { label: 'Closing Cash',  value: shift.closingCash  != null ? `NPR ${Number(shift.closingCash).toLocaleString()}`  : '—' },
                            { label: 'Pastries Sold', value: shift.pastriesSold ?? '—' },
                            { label: 'Drinks',        value: shift.drinksCount ?? '—' },
                            { label: 'Popular Drink', value: shift.popularDrink ?? '—' },
                            { label: 'Equipment Issue', value: shift.equipmentIssue ? '⚠️ Yes' : 'None' },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <p className="text-xs text-muted font-semibold uppercase tracking-wide">{label}</p>
                              <p className="font-semibold text-gray-900 mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>
                        {shift.shiftNotes && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100">
                            <p className="text-xs text-muted font-semibold uppercase tracking-wide mb-1">Notes</p>
                            <p className="text-sm text-gray-700">{shift.shiftNotes}</p>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
