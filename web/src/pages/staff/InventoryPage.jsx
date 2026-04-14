import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const CATEGORIES = ['beans','milk','syrup','food','packaging','cleaning','other'];
const CAT_LABELS = { beans:'Coffee Beans', milk:'Milk & Dairy', syrup:'Syrups', food:'Food', packaging:'Packaging', cleaning:'Cleaning', other:'Other' };
const CAT_COLORS = {
  beans:     'bg-amber-100 text-amber-800 border-amber-200',
  milk:      'bg-blue-100 text-blue-800 border-blue-200',
  syrup:     'bg-pink-100 text-pink-800 border-pink-200',
  food:      'bg-orange-100 text-orange-800 border-orange-200',
  packaging: 'bg-purple-100 text-purple-800 border-purple-200',
  cleaning:  'bg-cyan-100 text-cyan-800 border-cyan-200',
  other:     'bg-gray-100 text-gray-700 border-gray-200',
};

const EMPTY = { name:'', category:'beans', unit:'kg', quantity:'', reorderLevel:'', costPerUnit:'', notes:'' };
const UNITS = ['kg','g','litre','ml','pieces','boxes','rolls','bottles','bags'];

function StockBar({ quantity, reorderLevel }) {
  if (!reorderLevel || reorderLevel === 0) return null;
  const pct = Math.min((quantity / (reorderLevel * 3)) * 100, 100);
  const isLow = quantity <= reorderLevel;
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-green-400'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function InventoryPage() {
  const qc    = useQueryClient();
  const owner = isOwner();
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [adjustId, setAdjustId]   = useState(null);
  const [delta, setDelta]         = useState('');
  const [msg, setMsg]             = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['stock', filterCat],
    queryFn: () => stockApi.getAll(filterCat !== 'all' ? { category: filterCat } : {}),
  });

  const { data: lowData } = useQuery({
    queryKey: ['stock-low'],
    queryFn: () => stockApi.getLowStock(),
  });

  const items   = data?.data?.data ?? [];
  const lowItems = lowData?.data?.data ?? [];

  const createMut = useMutation({
    mutationFn: stockApi.create,
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-low']); setForm(EMPTY); setShowForm(false); flash('Item added.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => stockApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-low']); setEditing(null); setShowForm(false); flash('Updated.'); },
  });

  const deleteMut = useMutation({
    mutationFn: stockApi.delete,
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-low']); flash('Deleted.'); },
  });

  const adjustMut = useMutation({
    mutationFn: ({ id, delta }) => stockApi.adjust(id, delta),
    onSuccess: () => { qc.invalidateQueries(['stock']); qc.invalidateQueries(['stock-low']); setAdjustId(null); setDelta(''); flash('Stock updated.'); },
  });

  function flash(text) { setMsg(text); setTimeout(() => setMsg(''), 2500); }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {
      ...form,
      quantity:     parseFloat(form.quantity) || 0,
      reorderLevel: parseFloat(form.reorderLevel) || 0,
      costPerUnit:  form.costPerUnit ? parseFloat(form.costPerUnit) : null,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ name: item.name, category: item.category, unit: item.unit, quantity: String(item.quantity), reorderLevel: String(item.reorderLevel), costPerUnit: item.costPerUnit ? String(item.costPerUnit) : '', notes: item.notes ?? '' });
    setShowForm(true);
  }

  function handleAdjust(e) {
    e.preventDefault();
    const d = parseFloat(delta);
    if (isNaN(d)) return;
    adjustMut.mutate({ id: adjustId, delta: d });
  }

  // Group by category for display
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length) acc[cat] = catItems;
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} items tracked</p>
        </div>
        {owner && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90 transition-colors">
            {showForm ? 'Cancel' : 'Add Item'}
          </button>
        )}
      </div>

      {/* Low stock alert */}
      {lowItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="font-bold text-red-700 text-sm mb-2">{lowItems.length} item{lowItems.length > 1 ? 's' : ''} at or below reorder level</p>
          <div className="flex flex-wrap gap-2">
            {lowItems.map(i => (
              <span key={i.id} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold border border-red-200">
                {i.name} — {i.quantity} {i.unit} left
              </span>
            ))}
          </div>
        </div>
      )}

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl font-medium">{msg}</div>}

      {/* Add/Edit Form */}
      {showForm && owner && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">{editing ? 'Edit Item' : 'Add Stock Item'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Item Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="e.g. Ethiopia Yirgacheffe" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Current Quantity</label>
                <input type="number" min="0" step="0.1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm(f => ({...f, unit: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-secondary">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reorder Level</label>
                <input type="number" min="0" step="0.1" value={form.reorderLevel} onChange={e => setForm(f => ({...f, reorderLevel: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Cost / Unit (NPR)</label>
                <input type="number" min="0" step="0.01" value={form.costPerUnit} onChange={e => setForm(f => ({...f, costPerUnit: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="Optional" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-secondary" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">{editing ? 'Save Changes' : 'Add Item'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-gray-500 font-semibold text-sm hover:text-gray-900">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Adjust modal */}
      {adjustId && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-xs">
            <h3 className="font-bold text-gray-900 mb-1">Adjust Stock</h3>
            <p className="text-xs text-gray-500 mb-4">Enter positive to add, negative to remove</p>
            <form onSubmit={handleAdjust}>
              <input type="number" step="0.1" value={delta} onChange={e => setDelta(e.target.value)} required autoFocus
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-center text-xl font-bold focus:outline-none focus:border-secondary mb-4" placeholder="+1 or -0.5" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2.5 bg-secondary text-white font-semibold rounded-xl text-sm">Confirm</button>
                <button type="button" onClick={() => { setAdjustId(null); setDelta(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES].map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterCat === cat ? 'bg-secondary text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-secondary/50'}`}>
            {cat === 'all' ? 'All' : CAT_LABELS[cat]}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-12">Loading...</div>}

      {/* Grouped tables */}
      {filterCat === 'all' ? (
        Object.entries(grouped).map(([cat, catItems]) => (
          <CategoryTable key={cat} cat={cat} items={catItems} owner={owner} onEdit={startEdit} onDelete={(id) => { if (confirm('Delete this item?')) deleteMut.mutate(id); }} onAdjust={(id) => { setAdjustId(id); setDelta(''); }} />
        ))
      ) : (
        <CategoryTable cat={filterCat} items={items} owner={owner} onEdit={startEdit} onDelete={(id) => { if (confirm('Delete this item?')) deleteMut.mutate(id); }} onAdjust={(id) => { setAdjustId(id); setDelta(''); }} />
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No stock items yet</p>
          {owner && <p className="text-sm mt-1">Add items to start tracking inventory</p>}
        </div>
      )}
    </div>
  );
}

function CategoryTable({ cat, items, owner, onEdit, onDelete, onAdjust }) {
  if (!items.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${CAT_COLORS[cat]}`}>{CAT_LABELS[cat]}</span>
        <span className="text-xs text-gray-400">{items.length} items</span>
      </div>
      <div className="divide-y divide-gray-50">
        {items.map(item => {
          const isLow = item.reorderLevel > 0 && item.quantity <= item.reorderLevel;
          return (
            <div key={item.id} className={`flex items-center gap-4 px-5 py-3 ${isLow ? 'bg-red-50/50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                  {isLow && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded">LOW</span>}
                </div>
                {item.notes && <p className="text-xs text-gray-400 truncate">{item.notes}</p>}
                <StockBar quantity={item.quantity} reorderLevel={item.reorderLevel} />
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`font-bold text-sm ${isLow ? 'text-red-600' : 'text-gray-900'}`}>{item.quantity} {item.unit}</p>
                {item.reorderLevel > 0 && <p className="text-[10px] text-gray-400">reorder at {item.reorderLevel}</p>}
              </div>
              {item.costPerUnit && (
                <div className="text-right flex-shrink-0 hidden md:block">
                  <p className="text-xs text-gray-500">NPR {item.costPerUnit}/unit</p>
                </div>
              )}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => onAdjust(item.id)} className="text-xs text-secondary font-semibold px-2 py-1 rounded hover:bg-secondary/10">Adjust</button>
                {owner && <button onClick={() => onEdit(item)} className="text-xs text-gray-500 font-semibold px-2 py-1 rounded hover:bg-gray-100">Edit</button>}
                {owner && <button onClick={() => onDelete(item.id)} className="text-xs text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50">Delete</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
