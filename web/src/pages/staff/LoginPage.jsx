import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { authApi } from '../../lib/api.js';
import { setSession, isLoggedIn } from '../../lib/auth.js';

const USERS = [
  { role: 'barista_am', name: 'Barista 1', initials: 'B1', shift: 'Morning 6AM–2PM' },
  { role: 'barista_pm', name: 'Barista 2', initials: 'B2', shift: 'Afternoon 12PM–8PM' },
  { role: 'owner',      name: 'Owner',     initials: 'OW', shift: 'Full Access' },
];

export function LoginPage() {
  if (isLoggedIn()) return <Navigate to="/staff" replace />;

  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    if (!selected || pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const res  = await authApi.login(selected.role, pin);
      const { user, token } = res.data;
      setSession(user, token);
      navigate('/staff', { replace: true });
    } catch {
      setError('Incorrect PIN. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">☕</span>
          <h1 className="text-3xl font-extrabold text-secondary tracking-widest">FIKA</h1>
          <p className="text-muted text-sm mt-1">Staff Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {!selected ? (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Who's logging in?</h2>
              <div className="space-y-3">
                {USERS.map((u) => (
                  <button
                    key={u.role}
                    onClick={() => setSelected(u)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left hover:border-primary ${
                      u.role === 'owner' ? 'border-secondary bg-secondary/5' : 'border-gray-100 bg-surface'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      u.role === 'owner' ? 'bg-secondary' : 'bg-primary'
                    }`}>
                      {u.initials}
                    </div>
                    <div>
                      <p className={`font-bold ${u.role === 'owner' ? 'text-secondary' : 'text-gray-900'}`}>{u.name}</p>
                      <p className="text-xs text-muted">{u.shift}</p>
                    </div>
                    <span className="ml-auto text-muted">›</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => { setSelected(null); setPin(''); setError(''); }}
                className="text-sm text-muted hover:text-gray-900 mb-4 flex items-center gap-1"
              >
                ‹ Back
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                  selected.role === 'owner' ? 'bg-secondary' : 'bg-primary'
                }`}>
                  {selected.initials}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-muted">{selected.shift}</p>
                </div>
              </div>

              <form onSubmit={handleLogin}>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Enter 4-digit PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
                  placeholder="••••"
                  autoFocus
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl tracking-[1em] text-center focus:outline-none focus:border-primary transition-colors"
                />
                {error && (
                  <p className="mt-2 text-sm text-danger font-semibold text-center">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={pin.length !== 4 || loading}
                  className="w-full mt-4 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying…' : 'Log In'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <a href="/" className="hover:underline">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
