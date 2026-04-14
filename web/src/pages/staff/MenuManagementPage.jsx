import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const CATEGORIES = ['espresso','filter','cold','matcha','tea','smoothie','food','other'];
const CATEGORY_LABELS = {
  espresso: 'Espresso', filter: 'Filter Coffee', cold: 'Cold Drinks',
  matcha: 'Matcha', tea: 'Tea', smoothie: 'Smoothie', food: 'Food', other: 'Other',
};
const CATEGORY_COLORS = {
  espresso: 'bg-amber-100 text-amber-800', filter: 'bg-yellow-100 text-yellow-800',
  cold: 'bg-blue-100 text-blue-800', matcha: 'bg-green-100 text-green-800',
  tea: 'bg-emerald-100 text-emerald-800', smoothie: 'bg-pink-100 text-pink-800',
  food: 'bg-orange-100 text-orange-800', other: 'bg-gray-100 text-gray-700',
};

const EMPTY = { name: '', category: 'espresso', price: '', description: '' };

export function MenuManagementPage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['menu', filterCat],
    queryFn: () => menuApi.getAll(filterCat !== 'all' ? { category: filterCat } : {}),
  });

  const items = data?.data?.data ?? [];

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  const createMut = useMutation({
    mutationFn: menuApi.create,
    onSuccess: () => { qc.invalidateQueries(['menu']); setForm(EMPTY); setShowForm(false); setMsg('Item added.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => menuApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['menu']); setEditing(null); setMsg('Item updated.'); },
  });

  const toggleMut = useMutation({
    mutationFn: menuApi.toggle,
    onSuccess: () => qc.invalidateQueries(['menu']),
  });

  const deleteMut = useMutation({
    mutationFn: menuApi.delete,
    onSuccess: () => { qc.invalidateQueries(['menu']); setMsg('Item deleted.'); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, price: parseFloat(form.price) };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name, category: item.category, price: item.price, description: item.description ?? '' });
    setShowForm(true);
  }

  function cancelForm() { setEditing(null); setForm(EMPTY); setShowForm(false); }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} items across {Object.keys(grouped).length} categories</p>
        </div>
        {owner && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
            {showForm ? 'Cancel' : 'Add Item'}
          </button>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {showForm && owner && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Item' : 'New Menu Item'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Flat White" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Price (NPR)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} required min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="250" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Short description" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
              {editing ? 'Save Changes' : 'Add to Menu'}
            </button>
            <button type="button" onClick={cancelForm} className="px-4 py-2 text-gray-600 font-semibold text-sm hover:text-gray-900">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterCat === cat ? 'bg-secondary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-secondary'
            }`}>
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-8">Loading menu...</div>}

      {Object.entries(grouped).map(([cat, catItems]) => (
        <div key={cat} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${CATEGORY_COLORS[cat]}`}>{CATEGORY_LABELS[cat]}</span>
            <span className="text-xs text-gray-400">{catItems.length} items</span>
          </div>
          <div className="divide-y divide-gray-50">
            {catItems.map(item => (
              <div key={item.id} className={`flex items-center gap-4 px-5 py-3 ${!item.available ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  {item.description && <p className="text-xs text-gray-500 truncate">{item.description}</p>}
                </div>
                <span className="font-bold text-secondary text-sm">NPR {item.price.toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {item.available ? 'Available' : 'Unavailable'}
                </span>
                {owner && (
                  <div className="flex gap-2">
                    <button onClick={() => toggleMut.mutate(item.id)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50">
                      {item.available ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => startEdit(item)}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50">
                      Edit
                    </button>
                    <button onClick={() => { if (confirm(`Delete "${item.name}"?`)) deleteMut.mutate(item.id); }}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!isLoading && items.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No menu items yet</p>
          {owner && <p className="text-sm mt-1">Click "Add Item" to build your menu</p>}
        </div>
      )}
    </div>
  );
}
