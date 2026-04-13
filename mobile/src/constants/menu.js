export const MENU = {
  hotCoffee: [
    { name: 'Espresso',   price: 120 },
    { name: 'Americano',  price: 160 },
    { name: 'Cappuccino', price: 200 },
    { name: 'Latte',      price: 220 },
    { name: 'Flat White', price: 240 },
  ],
  icedCoffee: [
    { name: 'Iced Americano',     price: 180 },
    { name: 'Iced Latte',         price: 240 },
    { name: 'Iced Cappuccino',    price: 240 },
    { name: 'Iced Coconut Latte', price: 280 },
  ],
  flavoredLattes: [
    { name: 'Strawberry Latte',  price: 260 },
    { name: 'Blueberry Latte',   price: 260 },
    { name: 'Chocolate Latte',   price: 260 },
    { name: 'Caramel Latte',     price: 260 },
    { name: 'Honey Latte',       price: 260 },
  ],
  hotChocTea: [
    { name: 'Hot Chocolate',  price: 220 },
    { name: 'Masala Tea',     price: 120 },
    { name: 'Green Tea',      price: 140 },
  ],
  smoothies: [
    { name: 'Mango Smoothie',      price: 280 },
    { name: 'Strawberry Smoothie', price: 280 },
    { name: 'Blueberry Smoothie',  price: 280 },
    { name: 'Kiwi Smoothie',       price: 280 },
  ],
  icedTea: [
    { name: 'Peach Iced Tea',  price: 200 },
    { name: 'Apple Iced Tea',  price: 200 },
    { name: 'Lemon Iced Tea',  price: 180 },
  ],
  bubbleTea: [
    { name: 'Strawberry Boba',    price: 300 },
    { name: 'Chocolate Boba',     price: 300 },
    { name: 'Blueberry Boba',     price: 300 },
    { name: 'Mango Vanilla Boba', price: 300 },
  ],
  addOns: [
    { name: 'Extra Shot',  price: 60 },
    { name: 'Extra Syrup', price: 60 },
  ],
};

export const ALL_DRINK_NAMES = Object.values(MENU)
  .flat()
  .map((d) => d.name);

export const EXPENSE_CATEGORIES = [
  { value: 'supplies',    label: 'Supplies' },
  { value: 'utilities',   label: 'Utilities' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transport',   label: 'Transport' },
  { value: 'food',        label: 'Food' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'other',       label: 'Other' },
];

export const PAID_BY_OPTIONS = [
  { value: 'barista1',  label: 'Barista 1' },
  { value: 'barista2',  label: 'Barista 2' },
  { value: 'owner',     label: 'Owner' },
  { value: 'shop_cash', label: 'Shop Cash' },
];
