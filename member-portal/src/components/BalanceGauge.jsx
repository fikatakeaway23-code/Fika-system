export function BalanceGauge({ remaining, total, renewalDate, rolloverDrinks }) {
  const pct   = total > 0 ? Math.max(0, Math.min((remaining / total) * 100, 100)) : 0;
  const isLow = pct < 20;

  const daysUntilRenewal = renewalDate
    ? Math.ceil((new Date(renewalDate) - new Date()) / 86400000)
    : null;

  return (
    <div className="text-center py-6">
      <p className={`text-5xl font-bold mb-1 ${isLow ? 'text-red-600' : 'text-gray-900'}`}>
        {remaining}
        <span className="text-2xl text-gray-400 font-normal"> / {total}</span>
      </p>
      <p className="text-sm text-gray-500 mb-4">drinks remaining this month</p>

      <div className="h-3 rounded-full bg-gray-100 overflow-hidden mx-auto max-w-xs mb-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-center gap-4 text-xs text-gray-400 mt-2">
        {daysUntilRenewal !== null && (
          <span className={daysUntilRenewal <= 7 ? 'text-amber-600 font-semibold' : ''}>
            Renewal in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}
          </span>
        )}
        {rolloverDrinks > 0 && (
          <span className="text-primary">+{rolloverDrinks} rollover</span>
        )}
      </div>
    </div>
  );
}
