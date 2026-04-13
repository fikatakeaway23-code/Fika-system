import React from 'react';
import { Link } from 'react-router-dom';
import { PublicNav } from '../../components/PublicNav.jsx';

const TIERS = [
  {
    name: 'Individual',
    price: 2500,
    drinks: 20,
    color: 'border-primary',
    badge: '',
    features: ['20 drinks / month', 'Any drink on menu', 'Priority counter', 'Digital receipt'],
  },
  {
    name: 'Team Pack',
    price: 8000,
    drinks: 50,
    color: 'border-secondary ring-2 ring-secondary',
    badge: 'Most Popular',
    features: ['50 drinks / month', 'Up to 10 staff', 'Monthly invoice', 'Dedicated WhatsApp', 'Priority counter'],
  },
  {
    name: 'Corporate',
    price: 15000,
    drinks: 100,
    color: 'border-secondary',
    badge: '',
    features: ['100 drinks / month', 'Up to 25 staff', 'Monthly invoice', 'Account manager', 'Custom order list', 'Usage report'],
  },
  {
    name: 'Enterprise',
    price: 25000,
    drinks: 200,
    color: 'border-gray-300',
    badge: '',
    features: ['200 drinks / month', 'Unlimited staff', 'Monthly invoice', 'Dedicated account', 'Custom branding cups', 'Full analytics report'],
  },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Choose a plan',    desc: 'Pick the tier that fits your team size and monthly budget.' },
  { step: '02', title: 'Register your team', desc: 'Share staff names or a company code — we handle the rest.' },
  { step: '03', title: 'Collect coffees',  desc: 'Staff pick up drinks at the counter. No payment needed each time.' },
  { step: '04', title: 'Monthly invoice',  desc: 'One clean invoice at month end. Easy accounting.' },
];

export function CorporatePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Hero */}
      <div className="bg-secondary text-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-6">
            🏢 For Teams & Offices
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Coffee for your whole team</h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto">
            Pre-paid membership plans for companies in Dillibazar and nearby. One invoice, unlimited convenience.
          </p>
        </div>
      </div>

      {/* Pricing */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-3">Membership Plans</h2>
        <p className="text-muted text-center mb-12">Monthly allotments · Auto-renewing · Cancel anytime</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map(({ name, price, drinks, color, badge, features }) => (
            <div key={name} className={`relative bg-white rounded-2xl border-2 ${color} p-6 flex flex-col`}>
              {badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                  {badge}
                </span>
              )}
              <h3 className="text-lg font-extrabold text-gray-900 mb-1">{name}</h3>
              <div className="text-3xl font-extrabold text-secondary mb-0.5">NPR {price.toLocaleString()}</div>
              <p className="text-xs text-muted mb-4">per month · {drinks} drinks</p>
              <ul className="space-y-2 flex-1 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-primary mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <a
                href="https://wa.me/977980000000"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-secondary text-white text-sm font-bold rounded-xl text-center hover:bg-secondary/90 transition-colors"
              >
                Get Started
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">How it works</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-8">Common Questions</h2>
        {[
          { q: 'Can unused drinks roll over?', a: 'No — allotments reset each month. Unused drinks do not carry over, so plan your team size accordingly.' },
          { q: 'How do staff redeem drinks?', a: 'Staff simply mention the company name at the counter. We track usage on our end and send you a monthly report.' },
          { q: 'Can we upgrade mid-month?', a: 'Yes — contact us on WhatsApp and we\'ll prorate the difference.' },
          { q: 'Is there a setup fee?', a: 'No setup fee. Pay the first month\'s membership and you\'re active within 24 hours.' },
        ].map(({ q, a }) => (
          <div key={q} className="border-b border-gray-100 py-5">
            <p className="font-bold text-gray-900 mb-2">{q}</p>
            <p className="text-muted text-sm leading-relaxed">{a}</p>
          </div>
        ))}
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary text-center">
        <h2 className="text-2xl font-extrabold text-secondary mb-4">Ready to sign up?</h2>
        <p className="text-secondary/80 mb-6">Message us on WhatsApp — we'll get you set up today.</p>
        <a
          href="https://wa.me/977980000000"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-8 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors"
        >
          💬 WhatsApp Us
        </a>
      </section>

      <footer className="py-8 border-t border-gray-100 text-center text-sm text-muted">
        <p>© {new Date().getFullYear()} Fika Takeaway · Dillibazar, Kathmandu</p>
      </footer>
    </div>
  );
}
