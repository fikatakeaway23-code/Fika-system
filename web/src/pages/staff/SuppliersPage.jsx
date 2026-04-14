import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const CATEGORIES = ['coffee','milk','food','packaging','equipment','cleaning','other'];
const CAT_LABELS = { coffee:'Coffee', milk:'Milk & Dairy', food:'Food & Bakery', packaging:'Packaging', equipment:'Equipment', cleaning:'Cleaning', other:'Other' };
const CAT_COLORS = {
  coffee:'bg-amber-100 text-amber-800', milk:'bg-blue-100 text-blue-800',
  food:'bg-orange-100 text-orange-800', packaging:'bg-purple-100 text-purple-800',
  equipment:'bg-gray-100 text-gray-700', cleaning:'bg-cyan-100 text-cyan-800', other:'bg-gray-100 text-gray-600',
};

const EMPTY = { name:'', category:'coffee', contactPerson:'', phone:'', email:'', address:'', paymentTerms:'', notes:'', lastOrderDate:'' };

export function SuppliersPage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', filterCat],
    queryFn: () => supplierApi.getAll(filterCat !== 'all' ? { category: filterCat } : {}),
  });

  const suppliers = (data?.data?.data ?? []).filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.contactPerson ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const createMut = useMutation({
    mutationFn: supplierApi.create,
    onSuccess: () => { qc.invalidateQueries(['suppliers']); setForm(EMPTY); setShowForm(false); setMsg('Supplier added.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => supplierApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['suppliers']); setEditing(null); setShowForm(false); setMsg('Updated.'); },
  });

  const deleteMut = useMutation({
    mutationFn: supplierApi.delete,
    onSuccess: () => { qc.invalidateQueries(['suppliers']); setMsg('Deleted.'); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (editing) updateMut.mutate({ id: editing.id, data: form });
    else createMut.mutate(form);
  }

  function startEdit(s) {
    setEditing(s);
    setForm({ name: s.name, category: s.category, contactPerson: s.contactPerson ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '', paymentTerms: s.paymentTerms ?? '', notes: s.notes ?? '', lastOrderDate: s.lastOrderDate ? s.lastOrderDate.slice(0,10) : '' });
    setShowForm(true);
  }

  function fmt(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : '—'; }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Supplier Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{suppliers.length} suppliers</p>
        </div>
        {owner && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
            {showForm ? 'Cancel' : 'Add Supplier'}
          </button>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {showForm && owner && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Supplier Name</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Nepal Coffee Co." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Contact Person</label>
              <input value={form.contactPerson} onChange={e => setForm(f => ({...f, contactPerson: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="98XXXXXXXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="optional" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Last Order Date</label>
              <input type="date" value={form.lastOrderDate} onChange={e => setForm(f => ({...f, lastOrderDate: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Terms</label>
              <input value={form.paymentTerms} onChange={e => setForm(f => ({...f, paymentTerms: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Cash on delivery" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Address</label>
              <input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Any notes" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm">
              {editing ? 'Save Changes' : 'Add Supplier'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-gray-600 font-semibold text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-48" />
        <div className="flex gap-2 flex-wrap">
          {['all', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterCat === cat ? 'bg-secondary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {cat === 'all' ? 'All' : CAT_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-center text-gray-400 py-8">Loading...</div>}

      <div className="grid gap-4 md:grid-cols-2">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900">{s.name}</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${CAT_COLORS[s.category]}`}>{CAT_LABELS[s.category]}</span>
              </div>
              {owner && (
                <div className="flex gap-2">
                  <button onClick={() => startEdit(s)} className="text-xs text-gray-500 hover:text-gray-900 font-semibold px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                  <button onClick={() => { if(confirm('Delete?')) deleteMut.mutate(s.id); }} className="text-xs text-red-500 font-semibold px-2 py-1 rounded hover:bg-red-50">Delete</button>
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              {s.contactPerson && <p><span className="text-gray-400 text-xs">Contact</span> {s.contactPerson}</p>}
              {s.phone && <p><span className="text-gray-400 text-xs">Phone</span> <a href={`tel:${s.phone}`} className="text-secondary font-semibold">{s.phone}</a></p>}
              {s.email && <p><span className="text-gray-400 text-xs">Email</span> <a href={`mailto:${s.email}`} className="text-secondary">{s.email}</a></p>}
              {s.paymentTerms && <p><span className="text-gray-400 text-xs">Payment</span> {s.paymentTerms}</p>}
              {s.lastOrderDate && <p><span className="text-gray-400 text-xs">Last order</span> {fmt(s.lastOrderDate)}</p>}
              {s.address && <p><span className="text-gray-400 text-xs">Address</span> {s.address}</p>}
              {s.notes && <p className="text-xs text-gray-400 mt-2 italic">{s.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      {!isLoading && suppliers.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No suppliers found</p>
          {owner && <p className="text-sm mt-1">Add your first supplier</p>}
        </div>
      )}
    </div>
  );
}
