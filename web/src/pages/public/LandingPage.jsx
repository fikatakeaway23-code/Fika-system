import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../../components/PublicNav.jsx';

const FEATURES = [
  { emoji: '⚡', title: 'Fast',       desc: 'Ready in under 3 minutes. No waiting, no compromise.' },
  { emoji: '🌿', title: 'Fresh',      desc: 'Seasonal ingredients, single-origin beans, made daily.' },
  { emoji: '✅', title: 'Consistent', desc: 'Every drink dialled in. Same great cup, every time.' },
  { emoji: '😊', title: 'Friendly',   desc: 'We remember your order. You\'re family here.' },
];

const MENU_HIGHLIGHTS = [
  { name: 'Iced Coconut Latte',  price: 280, tag: 'Most Popular',  emoji: '🥥' },
  { name: 'Strawberry Boba',     price: 300, tag: 'Customer Fave', emoji: '🧋' },
  { name: 'Flat White',          price: 240, tag: 'Staff Pick',    emoji: '☕' },
  { name: 'Mango Smoothie',      price: 280, tag: 'Seasonal',      emoji: '🥭' },
];

const HOURS = [
  { day: 'Monday – Friday', hours: '6:00 AM – 8:00 PM' },
  { day: 'Saturday',        hours: '7:00 AM – 8:00 PM' },
  { day: 'Sunday',          hours: '8:00 AM – 6:00 PM' },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <section className="bg-primary relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6">
              📍 Dillibazar, Kathmandu
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-secondary leading-tight mb-4">
              Coffee worth<br />waking up for.
            </h1>
            <p className="text-secondary/80 text-lg mb-8 max-w-md">
              Specialty takeaway coffee, fresh pastries, and bubble tea — made fast, made right, every single time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link
                to="/menu"
                className="px-6 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors text-center"
              >
                See Our Menu
              </Link>
              <Link
                to="/corporate"
                className="px-6 py-3 bg-white text-secondary font-bold rounded-xl hover:bg-gray-50 transition-colors text-center"
              >
                Corporate Plans
              </Link>
            </div>
          </div>
          <div className="text-9xl md:text-[10rem] select-none">☕</div>
        </div>

        {/* Wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 80" fill="none">
          <path d="M0 80L1440 80L1440 20C1200 70 720 0 0 50L0 80Z" fill="white" />
        </svg>
      </section>

      {/* Tagline strip */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ emoji, title, desc }) => (
            <div key={title} className="text-center p-6 bg-surface rounded-2xl">
              <div className="text-4xl mb-3">{emoji}</div>
              <h3 className="text-lg font-bold text-secondary mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Menu highlights */}
      <section className="py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Customer Favourites</h2>
            <p className="text-muted">What everyone's ordering right now</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {MENU_HIGHLIGHTS.map(({ name, price, tag, emoji }) => (
              <div key={name} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <div className="text-5xl mb-3">{emoji}</div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{tag}</span>
                <h4 className="font-bold text-gray-900 mt-2 mb-1">{name}</h4>
                <p className="text-secondary font-extrabold">NPR {price}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/menu" className="inline-flex items-center gap-2 text-secondary font-bold hover:underline">
              View full menu →
            </Link>
          </div>
        </div>
      </section>

      {/* Hours & Location */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-6">Find Us</h2>
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-bold text-gray-900">Dillibazar, Kathmandu</p>
                <p className="text-muted text-sm">Near Dillibazar Bus Stop</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">📱</span>
              <p className="text-muted text-sm mt-1">Order on WhatsApp for corporate & bulk orders</p>
            </div>
          </div>
          <div className="bg-surface rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-4">Opening Hours</h3>
            <div className="space-y-3">
              {HOURS.map(({ day, hours }) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-muted">{day}</span>
                  <span className="text-sm font-semibold text-secondary">{hours}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Corporate CTA */}
      <section className="py-16 bg-secondary text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-extrabold mb-4">Need coffee for your team?</h2>
          <p className="text-white/80 mb-8 max-w-xl mx-auto">
            Corporate membership plans starting at NPR 8,000/month. Dedicated allotments, monthly invoicing, priority service.
          </p>
          <Link
            to="/corporate"
            className="inline-block px-8 py-3 bg-white text-secondary font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            View Corporate Plans
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} Fika Takeaway · Dillibazar, Kathmandu · Fast · Fresh · Consistent · Friendly</p>
      </footer>
    </div>
  );
}
