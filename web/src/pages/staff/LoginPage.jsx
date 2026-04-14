import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { authApi } from '../../lib/api.js';
import { setSession, isLoggedIn } from '../../lib/auth.js';

const USERS = [
  { role: 'barista_am', name: 'Barista 1', sub: 'Morning · 6 AM – 2 PM', color: 'bg-primary' },
  { role: 'barista_pm', name: 'Barista 2', sub: 'Afternoon · 12 PM – 8 PM', color: 'bg-emerald-500' },
  { role: 'owner',      name: 'Owner',     sub: 'Full access', color: 'bg-secondary' },
];

const NUMPAD = [
  ['1','2','3'],
  ['4','5','6'],
  ['7','8','9'],
  ['','0','⌫'],
];

export function LoginPage() {
  if (isLoggedIn()) return <Navigate to="/staff" replace />;

  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  function handleKey(key) {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      setError('');
    } else if (pin.length < 4) {
      const next = pin + key;
      setPin(next);
      setError('');
      if (next.length === 4) submitPin(next);
    }
  }

  async function submitPin(p) {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(selected.role, p);
      const { user, token } = res.data;
      setSession(user, token);
      navigate('/staff', { replace: true });
    } catch {
      setError('Incorrect PIN');
      setShake(true);
      setTimeout(() => { setShake(false); setPin(''); }, 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-xl tracking-widest">F</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-widest">FIKA</h1>
          <p className="text-gray-500 text-sm mt-1">Staff Dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {!selected ? (
            <div className="p-6">
              <p className="text-sm font-semibold text-gray-500 mb-4">Select your profile</p>
              <div className="space-y-2">
                {USERS.map((u) => {
                  const initials = u.name.split(' ').map(w => w[0]).join('');
                  return (
                    <button
                      key={u.role}
                      onClick={() => { setSelected(u); setPin(''); setError(''); }}
                      className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-secondary/30 hover:bg-secondary/5 transition-all text-left group"
                    >
                      <div className={`w-10 h-10 rounded-full ${u.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {initials}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm group-hover:text-secondary transition-colors">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              {/* Profile header */}
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
                <button
                  onClick={() => { setSelected(null); setPin(''); setError(''); }}
                  className="text-gray-400 hover:text-gray-700 text-lg font-light leading-none"
                >
                  ←
                </button>
                <div className={`w-8 h-8 rounded-full ${selected.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                  {selected.name.split(' ').map(w => w[0]).join('')}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm leading-tight">{selected.name}</p>
                  <p className="text-xs text-gray-400 leading-tight">{selected.sub}</p>
                </div>
              </div>

              <div className="p-6">
                {/* PIN display */}
                <p className="text-xs font-semibold text-gray-500 text-center mb-4">Enter PIN</p>
                <div className={`flex justify-center gap-3 mb-2 ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                        i < pin.length
                          ? `${selected.color} border-transparent scale-110`
                          : 'border-gray-300 bg-white'
                      } ${error ? 'border-red-400 bg-red-100' : ''}`}
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-xs text-red-500 font-semibold text-center mb-3">{error}</p>
                )}
                {!error && <div className="mb-3" />}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2">
                  {NUMPAD.flat().map((key, idx) => {
                    if (!key) return <div key={idx} />;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleKey(key)}
                        disabled={loading}
                        className={`h-14 rounded-xl text-lg font-bold transition-all active:scale-95 disabled:opacity-50 ${
                          key === '⌫'
                            ? 'text-gray-500 bg-gray-100 hover:bg-gray-200 text-base'
                            : 'text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 shadow-sm'
                        }`}
                      >
                        {loading && key !== '⌫' ? '' : key}
                      </button>
                    );
                  })}
                </div>

                {loading && (
                  <p className="text-center text-sm text-gray-400 mt-3 font-medium">Verifying…</p>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          <a href="/" className="hover:text-gray-600 transition-colors">← Back to website</a>
        </p>
      </div>
    </div>
  );
}
