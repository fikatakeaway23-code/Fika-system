import React from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../../lib/api.js';
import { getUser } from '../../lib/auth.js';

const LATENESS_LABEL = {
  on_time:  { label: 'On Time',  cls: 'bg-green-100 text-green-800' },
  minor:    { label: '< 15 min late', cls: 'bg-yellow-100 text-yellow-800' },
  moderate: { label: '15-30 min late', cls: 'bg-orange-100 text-orange-800' },
  severe:   { label: '> 30 min late',  cls: 'bg-red-100 text-red-800' },
};

export function AttendancePage() {
  const user  = getUser();
  const today = format(new Date(), 'yyyy-MM-dd');
  const qc    = useQueryClient();

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['attendance-history'],
    queryFn:  () => attendanceApi.getHistory({ limit: 30 }).then((r) => r.data),
    staleTime: 60_000,
  });

  const records  = historyData?.data ?? [];
  const todayRec = records.find((r) => format(new Date(r.date), 'yyyy-MM-dd') === today);

  const { mutate: checkIn, isPending, error } = useMutation({
    mutationFn: () => attendanceApi.checkIn(),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['attendance-history'] }),
  });

  const shiftLabel = user?.role === 'barista_am' ? 'AM Shift (8:00)' : user?.role === 'barista_pm' ? 'PM Shift (14:00)' : 'Shift';

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-extrabold text-gray-900">Attendance</h1>

      {/* Check-in card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{shiftLabel}</p>
        <p className="text-lg font-extrabold text-gray-900 mb-5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>

        {todayRec ? (
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-5 py-3">
              <span className="text-2xl">✓</span>
              <div className="text-left">
                <p className="font-bold text-green-800">Checked in</p>
                <p className="text-sm text-green-700">
                  {todayRec.arrivalTime ? format(new Date(todayRec.arrivalTime), 'h:mm a') : '—'}
                </p>
              </div>
            </div>
            {todayRec.latenessCategory && (
              <div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${LATENESS_LABEL[todayRec.latenessCategory]?.cls ?? ''}`}>
                  {LATENESS_LABEL[todayRec.latenessCategory]?.label ?? todayRec.latenessCategory}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <button
              onClick={() => checkIn()}
              disabled={isPending}
              className="bg-secondary text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
            >
              {isPending ? 'Checking in…' : 'Check In'}
            </button>
            {error && (
              <p className="text-red-500 text-sm mt-3">
                {error.response?.data?.error ?? 'Failed to check in'}
              </p>
            )}
          </>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h2 className="font-bold text-gray-900 text-sm">Attendance History</h2>
        </div>
        {isLoading ? (
          <p className="text-muted text-sm text-center py-10">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-muted text-sm text-center py-10">No records yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Time</th>
                <th className="text-right px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((r) => {
                const badge = LATENESS_LABEL[r.latenessCategory];
                return (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {format(new Date(r.date), 'EEE d MMM')}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {r.arrivalTime ? format(new Date(r.arrivalTime), 'h:mm a') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {badge && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
