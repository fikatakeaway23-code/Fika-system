import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearToken, getAccount } from '../lib/auth.js';

const NAV = [
  { to: '/',        label: 'Dashboard',     end: true },
  { to: '/usage',   label: 'Usage log' },
  { to: '/chart',   label: 'Monthly chart' },
  { to: '/topup',   label: 'Top-up' },
  { to: '/profile', label: 'Profile' },
];

export function Layout() {
  const navigate = useNavigate();
  const account  = getAccount();
  const navItems = account?.mustChangePassword
    ? NAV.filter((item) => item.to === '/profile')
    : NAV;

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">F</span>
            </div>
            <div>
              <p className="font-black text-primary text-sm tracking-widest leading-none">FIKA</p>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">Member Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-all ${
                  isActive ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-100 p-3">
          <p className="text-xs font-semibold text-gray-700 truncate px-2 mb-1">
            {account?.membership?.companyName ?? 'Member'}
          </p>
          <button
            onClick={handleLogout}
            className="w-full text-xs text-red-500 font-semibold py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
              <span className="text-white font-black text-[10px]">F</span>
            </div>
            <span className="font-black text-primary tracking-widest text-sm">FIKA</span>
          </div>
          <button onClick={handleLogout} className="text-xs text-red-500 font-semibold">Log out</button>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-10">
          {navItems.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-gray-400'
                }`
              }
            >
              {label.split(' ')[0]}
            </NavLink>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
