import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const PRIORITY_STYLES = {
  normal:    'bg-gray-100 text-gray-600',
  important: 'bg-yellow-100 text-yellow-700',
  urgent:    'bg-red-100 text-red-700',
};

const EMPTY = { title: '', body: '', priority: 'normal', pinned: false, expiresAt: '' };

export function AnnouncementsPage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['announcements-all'],
    queryFn: owner ? announcementApi.getAll : announcementApi.getActive,
  });

  const items = data?.data?.data ?? [];

  const createMut = useMutation({
    mutationFn: announcementApi.create,
    onSuccess: () => { qc.invalidateQueries(['announcements-all']); setForm(EMPTY); setShowForm(false); setMsg('Announcement posted.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => announcementApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['announcements-all']); setEditing(null); setShowForm(false); setMsg('Updated.'); },
  });

  const deleteMut = useMutation({
    mutationFn: announcementApi.delete,
    onSuccess: () => { qc.invalidateQueries(['announcements-all']); setMsg('Deleted.'); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, expiresAt: form.expiresAt || null };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ title: item.title, body: item.body, priority: item.priority, pinned: item.pinned, expiresAt: item.expiresAt ? item.expiresAt.slice(0,10) : '' });
    setShowForm(true);
  }

  function fmt(d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }

  const pinned = items.filter(i => i.pinned);
  const regular = items.filter(i => !i.pinned);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Notice board for all staff</p>
        </div>
        {owner && (
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
            {showForm ? 'Cancel' : 'Post Notice'}
          </button>
        )}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {showForm && owner && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Notice' : 'New Notice'}</h2>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Notice title" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Message</label>
            <textarea value={form.body} onChange={e => setForm(f => ({...f, body: e.target.value}))} required rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Write your message..." />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="normal">Normal</option>
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Expires (optional)</label>
              <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({...f, expiresAt: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => setForm(f => ({...f, pinned: e.target.checked}))}
                  className="w-4 h-4 accent-secondary" />
                <span className="text-sm font-semibold text-gray-700">Pin to top</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
              {editing ? 'Save Changes' : 'Post Notice'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}
              className="px-4 py-2 text-gray-600 font-semibold text-sm">Cancel</button>
          </div>
        </form>
      )}

      {isLoading && <div className="text-center text-gray-400 py-8">Loading...</div>}

      {pinned.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pinned</p>
          {pinned.map(item => <NoticeCard key={item.id} item={item} owner={owner} onEdit={startEdit} onDelete={id => { if(confirm('Delete?')) deleteMut.mutate(id); }} fmt={fmt} />)}
        </div>
      )}

      {regular.length > 0 && (
        <div className="space-y-3">
          {pinned.length > 0 && <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Notices</p>}
          {regular.map(item => <NoticeCard key={item.id} item={item} owner={owner} onEdit={startEdit} onDelete={id => { if(confirm('Delete?')) deleteMut.mutate(id); }} fmt={fmt} />)}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No announcements</p>
          {owner && <p className="text-sm mt-1">Post a notice for your staff</p>}
        </div>
      )}
    </div>
  );
}

function NoticeCard({ item, owner, onEdit, onDelete, fmt }) {
  return (
    <div className={`bg-white border rounded-2xl p-5 shadow-sm ${item.pinned ? 'border-secondary/30' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {item.pinned && <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-bold rounded-full">Pinned</span>}
            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${PRIORITY_STYLES[item.priority]}`}>{item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}</span>
            <span className="text-xs text-gray-400">{fmt(item.createdAt)}</span>
            {item.expiresAt && <span className="text-xs text-gray-400">Expires {fmt(item.expiresAt)}</span>}
          </div>
          <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.body}</p>
        </div>
        {owner && (
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => onEdit(item)} className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50">Edit</button>
            <button onClick={() => onDelete(item.id)} className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}
