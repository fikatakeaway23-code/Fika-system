import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clearSession, getUser, isOwner } from '../../lib/auth.js';
import { membershipApi } from '../../lib/api.js';

const NAV_GROUPS = [
  {
    label: 'Operations',
    links: [
      { to: '/staff',               label: 'Overview',    end: true },
      { to: '/staff/my-shift',      label: 'My Shift' },
      { to: '/staff/attendance',    label: 'Attendance' },
      { to: '/staff/checklist',     label: 'Checklist' },
      { to: '/staff/shifts',        label: 'Shifts' },
      { to: '/staff/finance',       label: 'Finance' },
      { to: '/staff/reports',       label: 'Reports' },
      { to: '/staff/expenses',      label: 'Expenses' },
    ],
  },
  {
    label: 'Team',
    links: [
      { to: '/staff/announcements',  label: 'Announcements' },
      { to: '/staff/schedule',       label: 'Schedule' },
      { to: '/staff/hr',             label: 'HR Records' },
    ],
  },
  {
    label: 'Management',
    ownerOnly: true,
    links: [
      { to: '/staff/analytics',      label: 'Analytics' },
      { to: '/staff/menu',           label: 'Menu' },
      { to: '/staff/targets',        label: 'Targets' },
      { to: '/staff/suppliers',      label: 'Suppliers' },
      { to: '/staff/memberships',    label: 'Memberships' },
      { to: '/staff/inventory',      label: 'Inventory' },
      { to: '/staff/waste',          label: 'Waste Log' },
      { to: '/staff/equipment',      label: 'Equipment' },
    ],
  },
];

function SidebarContent({ owner, onNav, onLogout, user, pendingTopUps }) {
  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-xs tracking-widest">F</span>
          </div>
          <div>
            <p className="font-black text-secondary text-sm tracking-widest leading-none">FIKA</p>
            <p className="text-[10px] text-gray-400 font-medium leading-none mt-0.5">Staff Portal</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_GROUPS.map((group) => {
          if (group.ownerOnly && !owner) return null;
          return (
            <div key={group.label} className="mb-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1.5">{group.label}</p>
              {group.links.map(({ to, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNav}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                      isActive
                        ? 'bg-secondary text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                >
                  <span className="flex-1">{label}</span>
                  {label === 'Memberships' && pendingTopUps > 0 && (
                    <span className="text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                      {pendingTopUps > 9 ? '9+' : pendingTopUps}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User card */}
      <div className="border-t border-gray-100 p-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${owner ? 'bg-secondary' : 'bg-primary'}`}>
            {initials}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{user?.name ?? 'Staff'}</p>
            <p className="text-[11px] text-gray-400 capitalize leading-tight">{user?.role?.replace('_', ' ') ?? ''}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full mt-1 text-xs text-red-500 font-semibold py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const user     = getUser();
  const owner    = isOwner();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: topUpData } = useQuery({
    queryKey:        ['topup-pending-count'],
    queryFn:         () => membershipApi.getTopUpRequests('pending').then((r) => r.data),
    enabled:         owner,
    refetchInterval: 60_000,
    staleTime:       30_000,
  });
  const pendingTopUps = topUpData?.requests?.length ?? 0;

  function handleLogout() {
    clearSession();
    navigate('/staff/login', { replace: true });
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <SidebarContent owner={owner} onNav={() => {}} onLogout={handleLogout} user={user} pendingTopUps={pendingTopUps} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-white shadow-xl">
            <SidebarContent owner={owner} onNav={() => setSidebarOpen(false)} onLogout={handleLogout} user={user} pendingTopUps={pendingTopUps} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1.5 p-1.5 rounded-lg hover:bg-gray-100"
          >
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-secondary rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">F</span>
            </div>
            <span className="font-black text-secondary tracking-widest text-sm">FIKA</span>
          </div>
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${owner ? 'bg-secondary' : 'bg-primary'}`}>
              {initials}
            </div>
            {pendingTopUps > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                {pendingTopUps > 9 ? '9+' : pendingTopUps}
              </span>
            )}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
