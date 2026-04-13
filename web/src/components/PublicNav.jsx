import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const LINKS = [
  { to: '/',          label: 'Home' },
  { to: '/menu',      label: 'Menu' },
  { to: '/corporate', label: 'Corporate' },
  { to: '/about',     label: 'About' },
];

export function PublicNav() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">☕</span>
          <span className="text-xl font-extrabold text-secondary tracking-widest">FIKA</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                pathname === to
                  ? 'bg-primary/10 text-secondary'
                  : 'text-gray-600 hover:text-secondary hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/staff/login"
            className="ml-4 px-4 py-2 bg-secondary text-white text-sm font-bold rounded-lg hover:bg-secondary/90 transition-colors"
          >
            Staff Login
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1">
          {LINKS.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={`px-4 py-3 rounded-lg text-sm font-semibold ${
                pathname === to ? 'bg-primary/10 text-secondary' : 'text-gray-700'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            to="/staff/login"
            onClick={() => setOpen(false)}
            className="mt-2 px-4 py-3 bg-secondary text-white text-sm font-bold rounded-lg text-center"
          >
            Staff Login
          </Link>
        </div>
      )}
    </nav>
  );
}
