import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentApi } from '../../lib/api.js';
import { isOwner } from '../../lib/auth.js';

const STATUS_STYLES = {
  open:        'bg-red-100 text-red-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved:    'bg-green-100 text-green-700',
};
const STATUS_LABELS = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved' };

const EQUIPMENT_LIST = ['Espresso machine','Grinder','Milk steamer','Fridge','Freezer','Blender','POS machine','Coffee scale','Water filter','Air conditioner','Other'];

const EMPTY = { equipment: '', issue: '', status: 'open', repairCost: '', technicianName: '', notes: '' };

export function EquipmentPage() {
  const qc = useQueryClient();
  const owner = isOwner();
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', filterStatus],
    queryFn: () => equipmentApi.getAll(filterStatus !== 'all' ? { status: filterStatus } : {}),
  });

  const logs = data?.data?.data ?? [];
  const open = logs.filter(l => l.status === 'open').length;
  const inProgress = logs.filter(l => l.status === 'in_progress').length;

  const createMut = useMutation({
    mutationFn: equipmentApi.create,
    onSuccess: () => { qc.invalidateQueries(['equipment']); setForm(EMPTY); setShowForm(false); setMsg('Issue logged.'); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => equipmentApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['equipment']); setEditing(null); setShowForm(false); setMsg('Updated.'); },
  });

  const deleteMut = useMutation({
    mutationFn: equipmentApi.delete,
    onSuccess: () => { qc.invalidateQueries(['equipment']); setMsg('Deleted.'); },
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, repairCost: form.repairCost ? parseFloat(form.repairCost) : null };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  }

  function startEdit(item) {
    setEditing(item);
    setForm({ equipment: item.equipment, issue: item.issue, status: item.status, repairCost: item.repairCost ?? '', technicianName: item.technicianName ?? '', notes: item.notes ?? '' });
    setShowForm(true);
  }

  function fmt(d) { return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Equipment Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track issues and maintenance</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm(EMPTY); }}
          className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl text-sm hover:bg-secondary/90">
          {showForm ? 'Cancel' : 'Log Issue'}
        </button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open Issues', value: open, color: 'text-red-600' },
          { label: 'In Progress', value: inProgress, color: 'text-yellow-600' },
          { label: 'Total Logged', value: logs.length, color: 'text-gray-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {msg && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-2 rounded-xl">{msg}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-gray-900">{editing ? 'Edit Issue' : 'Log New Issue'}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Equipment</label>
              <select value={form.equipment} onChange={e => setForm(f => ({...f, equipment: e.target.value}))} required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select equipment</option>
                {EQUIPMENT_LIST.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Issue Description</label>
              <textarea value={form.issue} onChange={e => setForm(f => ({...f, issue: e.target.value}))} required rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Describe the problem..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Technician Name</label>
              <input value={form.technicianName} onChange={e => setForm(f => ({...f, technicianName: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Repair Cost (NPR)</label>
              <input type="number" value={form.repairCost} onChange={e => setForm(f => ({...f, repairCost: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Optional" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
              <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Any additional notes" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2 bg-secondary text-white font-semibold rounded-xl text-sm">
              {editing ? 'Save Changes' : 'Log Issue'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-gray-600 font-semibold text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['all','open','in_progress','resolved'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filterStatus === s ? 'bg-secondary text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-gray-400 py-8">Loading...</div>}

      <div className="space-y-3">
        {logs.map(log => (
          <div key={log.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-gray-900 text-sm">{log.equipment}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[log.status]}`}>{STATUS_LABELS[log.status]}</span>
                  <span className="text-xs text-gray-400">Reported {fmt(log.reportedAt)}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{log.issue}</p>
                <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                  {log.technicianName && <span>Technician: {log.technicianName}</span>}
                  {log.repairCost && <span>Cost: NPR {log.repairCost.toLocaleString()}</span>}
                  {log.resolvedAt && <span>Resolved: {fmt(log.resolvedAt)}</span>}
                  {log.notes && <span>Note: {log.notes}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(log)} className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                {owner && <button onClick={() => { if(confirm('Delete?')) deleteMut.mutate(log.id); }} className="text-xs font-semibold text-red-500 px-2 py-1 rounded hover:bg-red-50">Delete</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && logs.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-10 text-center text-gray-400 shadow-sm">
          <p className="font-semibold">No equipment issues logged</p>
        </div>
      )}
    </div>
  );
}
