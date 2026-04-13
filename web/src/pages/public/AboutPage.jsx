import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../../components/PublicNav.jsx';

const VALUES = [
  { emoji: '🫘', title: 'Quality Beans',    desc: 'Single-origin beans sourced from Nepal and Ethiopia, roasted fresh.' },
  { emoji: '🧪', title: 'Dialled-In',       desc: 'Every shot calibrated daily. We dial in at open, every single morning.' },
  { emoji: '🌱', title: 'Local First',      desc: 'Local milk suppliers, seasonal ingredients, community employment.' },
  { emoji: '♻️', title: 'Mindful Waste',   desc: 'We log every calibration shot, every unsold pastry. Waste tracked daily.' },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <div className="bg-surface py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="text-6xl block mb-6">☕</span>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">A coffee shop with a system.</h1>
          <p className="text-muted text-lg leading-relaxed">
            Fika isn't just a takeaway — it's a commitment to precision. Every barista follows the same SOP, every shot is tracked, every shift is documented. The result? A cup you can count on.
          </p>
        </div>
      </div>

      {/* Story */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Our Story</h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Fika Takeaway opened in Dillibazar with a simple conviction: Kathmandu deserves specialty coffee that's fast, affordable, and consistent. Not just sometimes — every time.
        </p>
        <p className="text-gray-700 leading-relaxed mb-4">
          The name <em>Fika</em> is borrowed from Swedish culture, where it means taking a meaningful break with coffee and good company. We can't always slow down, but we can make the coffee worth it.
        </p>
        <p className="text-gray-700 leading-relaxed">
          We run a tight operation: two dedicated baristas, a full digital log of every shift, and an owner who reviews every discrepancy. That's the Fika difference.
        </p>
      </section>

      {/* Values */}
      <section className="py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-10">What we stand for</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {VALUES.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 text-center border border-gray-100">
                <div className="text-4xl mb-3">{emoji}</div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-8">The Team</h2>
        <div className="flex justify-center gap-8 flex-wrap">
          {[
            { initials: 'B1', role: 'Barista 1', shift: 'Morning 6AM–2PM',    color: '#6BCB77' },
            { initials: 'B2', role: 'Barista 2', shift: 'Afternoon 12PM–8PM', color: '#6BCB77' },
            { initials: 'OW', role: 'Owner',     shift: 'Always watching',    color: '#2D6A4F' },
          ].map(({ initials, role, shift, color }) => (
            <div key={role} className="text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-3"
                style={{ backgroundColor: color }}
              >
                {initials}
              </div>
              <p className="font-bold text-gray-900">{role}</p>
              <p className="text-sm text-muted">{shift}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-secondary text-white text-center">
        <h2 className="text-2xl font-extrabold mb-3">Come say hi.</h2>
        <p className="text-white/80 mb-6">We're at Dillibazar, open from 6AM. First coffee's on us — just kidding, but we'll make it worth your walk.</p>
        <Link to="/menu" className="inline-block px-6 py-3 bg-white text-secondary font-bold rounded-xl hover:bg-gray-50 transition-colors">
          See the Menu
        </Link>
      </section>

      <footer className="py-8 border-t border-gray-100 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} Fika Takeaway · Dillibazar, Kathmandu · Fast · Fresh · Consistent · Friendly</p>
      </footer>
    </div>
  );
}
