import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { memberApi } from '../lib/api.js';

const TIER_LABELS = {
  daily_pass:    'Fika Pass',
  team_pack:     'Fika Plus',
  office_bundle: 'Fika Gold',
};

export function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading,       setPwLoading]       = useState(false);
  const [pwError,         setPwError]         = useState('');
  const [pwSuccess,       setPwSuccess]       = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn:  () => memberApi.getProfile().then(r => r.data),
    staleTime: 120_000,
  });

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwError('New passwords do not match.'); return; }
    if (newPassword.length < 8)          { setPwError('New password must be at least 8 characters.'); return; }
    setPwLoading(true);
    setPwError('');
    try {
      await memberApi.changePassword(currentPassword, newPassword);
      setPwSuccess(true);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwLoading(false);
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading…</div>;

  const m = data?.membership;

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Company</p>
        <div className="space-y-3">
          {[
            { label: 'Company',        value: m?.companyName },
            { label: 'Contact person', value: m?.contactPerson },
            { label: 'WhatsApp',       value: m?.whatsapp },
            { label: 'Plan',           value: TIER_LABELS[m?.tier] ?? m?.tier },
            { label: 'Staff count',    value: m?.staffCount },
            { label: 'Monthly fee',    value: m?.monthlyFee != null ? `NPR ${Number(m.monthlyFee).toLocaleString()}` : undefined },
            { label: 'Renewal date',   value: m?.renewalDate ? new Date(m.renewalDate).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-500">{label}</span>
              <span className="font-medium text-gray-900">{value ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Change password</p>
        {pwSuccess ? (
          <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            Password changed successfully.
          </div>
        ) : (
          <form onSubmit={handlePasswordChange} className="space-y-3">
            {[
              { label: 'Current password', value: currentPassword, onChange: setCurrentPassword, placeholder: '••••••••' },
              { label: 'New password',     value: newPassword,     onChange: setNewPassword,     placeholder: 'Min 8 characters' },
              { label: 'Confirm new',      value: confirmPassword, onChange: setConfirmPassword, placeholder: '••••••••' },
            ].map(({ label, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={e => onChange(e.target.value)}
                  required
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            ))}
            {pwError && <p className="text-xs text-red-600 font-medium">{pwError}</p>}
            <button type="submit" disabled={pwLoading} className="w-full bg-primary text-white font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm">
              {pwLoading ? 'Saving…' : 'Change password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
