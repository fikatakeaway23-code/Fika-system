import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

export function TopUpPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const { data: dashData } = useQuery({
    queryKey: ['member-dashboard'],
    queryFn:  () => memberApi.getDashboard().then(r => r.data),
    staleTime: 60_000,
  });

  const remaining = dashData?.membership?.drinksRemaining ?? null;

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await memberApi.submitTopUp(message);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="max-w-sm mx-auto text-center py-16 space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Request sent!</h2>
        <p className="text-sm text-gray-500">Fika will contact you to process your top-up.</p>
        <button onClick={() => { setSent(false); setMessage(''); }} className="text-sm font-medium text-primary hover:underline">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Request a top-up</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {remaining !== null && (
          <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4">
            <p className="text-xs text-gray-500 mb-1">Current balance</p>
            <p className="text-2xl font-bold text-gray-900">{remaining} <span className="text-sm font-normal text-gray-400">drinks remaining</span></p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
              Message to Fika <span className="text-gray-400 normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="e.g. We have a team event on Apr 20 and need 10 extra drinks"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {loading ? 'Sending…' : 'Send request to Fika'}
          </button>
        </form>
        <p className="text-xs text-gray-400 text-center mt-4">Fika will reach out via WhatsApp to confirm.</p>
      </div>
    </div>
  );
}
