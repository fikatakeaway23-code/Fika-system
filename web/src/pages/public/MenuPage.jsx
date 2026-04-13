import React, { useState } from 'react';
import { PublicNav } from '../../components/PublicNav.jsx';

const MENU = {
  'Hot Coffee': [
    { name: 'Espresso',   price: 120 },
    { name: 'Americano',  price: 160 },
    { name: 'Cappuccino', price: 200 },
    { name: 'Latte',      price: 220 },
    { name: 'Flat White', price: 240 },
  ],
  'Iced Coffee': [
    { name: 'Iced Americano',     price: 180 },
    { name: 'Iced Latte',         price: 240 },
    { name: 'Iced Cappuccino',    price: 240 },
    { name: 'Iced Coconut Latte', price: 280 },
  ],
  'Flavoured Lattes': [
    { name: 'Strawberry Latte',  price: 260 },
    { name: 'Blueberry Latte',   price: 260 },
    { name: 'Chocolate Latte',   price: 260 },
    { name: 'Caramel Latte',     price: 260 },
    { name: 'Honey Latte',       price: 260 },
  ],
  'Hot Choc & Tea': [
    { name: 'Hot Chocolate', price: 220 },
    { name: 'Masala Tea',    price: 120 },
    { name: 'Green Tea',     price: 140 },
  ],
  'Smoothies': [
    { name: 'Mango Smoothie',      price: 280 },
    { name: 'Strawberry Smoothie', price: 280 },
    { name: 'Blueberry Smoothie',  price: 280 },
    { name: 'Kiwi Smoothie',       price: 280 },
  ],
  'Iced Tea': [
    { name: 'Peach Iced Tea', price: 200 },
    { name: 'Apple Iced Tea', price: 200 },
    { name: 'Lemon Iced Tea', price: 180 },
  ],
  'Bubble Tea': [
    { name: 'Strawberry Boba',    price: 300 },
    { name: 'Chocolate Boba',     price: 300 },
    { name: 'Blueberry Boba',     price: 300 },
    { name: 'Mango Vanilla Boba', price: 300 },
  ],
  'Add-ons': [
    { name: 'Extra Shot',  price: 60 },
    { name: 'Extra Syrup', price: 60 },
  ],
};

const CATEGORY_EMOJIS = {
  'Hot Coffee': '☕', 'Iced Coffee': '🧊', 'Flavoured Lattes': '🌸',
  'Hot Choc & Tea': '🍵', 'Smoothies': '🥤', 'Iced Tea': '🫖',
  'Bubble Tea': '🧋', 'Add-ons': '➕',
};

export function MenuPage() {
  const [active, setActive] = useState('Hot Coffee');

  return (
    <div className="min-h-screen bg-white">
      <PublicNav />

      {/* Header */}
      <div className="bg-primary py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl font-extrabold text-secondary mb-2">Our Menu</h1>
          <p className="text-secondary/70">All prices in NPR · Takeaway only</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {Object.keys(MENU).map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                active === cat
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface text-muted hover:text-gray-900'
              }`}
            >
              <span>{CATEGORY_EMOJIS[cat]}</span>
              <span>{cat}</span>
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {MENU[active].map(({ name, price }) => (
            <div
              key={name}
              className="bg-surface rounded-2xl p-5 border border-gray-100 hover:border-primary/30 hover:shadow-sm transition-all"
            >
              <div className="text-4xl mb-3 text-center">{CATEGORY_EMOJIS[active]}</div>
              <h3 className="font-bold text-gray-900 text-center mb-1">{name}</h3>
              <p className="text-center text-secondary font-extrabold text-lg">NPR {price}</p>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-muted text-sm mt-10">
          🥛 Oat milk & soy milk available on request (+ NPR 40) · Seasonal specials may vary
        </p>
      </div>

      <footer className="py-8 border-t border-gray-100 text-center text-sm text-muted mt-8">
        <p>© {new Date().getFullYear()} Fika Takeaway · Dillibazar, Kathmandu</p>
      </footer>
    </div>
  );
}
