import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { clearSession, getUser, isOwner } from '../../lib/auth.js';

const BASE_LINKS = [
  { to: '/staff',           label: 'Overview',     emoji: '📊', end: true },
  { to: '/staff/shifts',    label: 'Shifts',        emoji: '📋' },
  { to: '/staff/finance',   label: 'Finance',       emoji: '💰' },
  { to: '/staff/reports',   label: 'Reports',       emoji: '📈' },
  { to: '/staff/expenses',  label: 'Expenses',      emoji: '💸' },
];

const OWNER_LINKS = [
  { to: '/staff/memberships', label: 'Memberships', emoji: '🏢' },
  { to: '/staff/hr',          label: 'HR',          emoji: '👥' },
];

export function DashboardLayout() {
  const navigate  = useNavigate();
  const user      = getUser();
  const owner     = isOwner();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links = owner ? [...BASE_LINKS, ...OWNER_LINKS] : BASE_LINKS;

  function handleLogout() {
    clearSession();
    navigate('/staff/login', { replace: true });
  }

  const initials = user?.name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '??';

  const NavItems = () => (
    <nav className="flex-1 overflow-y-auto py-4">
      {links.map(({ to, label, emoji, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => setSidebarOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-sm font-semibold transition-colors mb-0.5 ${
              isActive
                ? 'bg-primary/15 text-secondary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <span className="text-lg">{emoji}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-100 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-16 border-b border-gray-100 flex-shrink-0">
          <span className="text-xl">☕</span>
          <span className="font-extrabold text-secondary tracking-widest">FIKA</span>
          <span className="ml-auto text-xs text-muted font-medium">Staff</span>
        </div>

        <NavItems />

        {/* User + logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${owner ? 'bg-secondary' : 'bg-primary'}`}>
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.name ?? 'Staff'}</p>
              <p className="text-xs text-muted capitalize">{user?.role?.replace('_', ' ') ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-sm text-danger font-semibold py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100">
              <span className="font-extrabold text-secondary tracking-widest">FIKA</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-muted">✕</button>
            </div>
            <NavItems />
            <div className="border-t border-gray-100 p-4">
              <button onClick={handleLogout} className="w-full text-sm text-danger font-semibold py-2 rounded-lg hover:bg-red-50">
                Log Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100">
            ☰
          </button>
          <span className="font-extrabold text-secondary tracking-widest">FIKA</span>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${owner ? 'bg-secondary' : 'bg-primary'}`}>
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
