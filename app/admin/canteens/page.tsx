'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import { Store, Plus, UserCheck, Edit2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Canteen {
  id: string;
  name: string;
  location: string;
  status: string;
  ownerId: string | null;
  owner?: { name: string; email: string } | null;
  _count?: { menuItems: number; orders: number };
}

interface OwnerOption {
  id: string;
  name: string;
  email: string;
}

export default function AdminCanteensPage() {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [availableOwners, setAvailableOwners] = useState<OwnerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingCanteen, setEditingCanteen] = useState<Canteen | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('LIVE');
  const [selectedOwnerId, setSelectedOwnerId] = useState('unassigned');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchCanteens = () => {
    fetch('/api/admin/canteens')
      .then((res) => res.json())
      .then((data) => {
        setCanteens(data.canteens || []);
        setAvailableOwners(data.availableOwners || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCanteens();
  }, []);

  const handleSaveCanteen = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const method = editingCanteen ? 'PUT' : 'POST';
    const body = editingCanteen
      ? { id: editingCanteen.id, name, location, status, ownerId: selectedOwnerId }
      : { name, location, status, ownerId: selectedOwnerId === 'unassigned' ? null : selectedOwnerId };

    try {
      const res = await fetch('/api/admin/canteens', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage(editingCanteen ? 'Canteen updated!' : 'New canteen created!');
        setShowModal(false);
        setEditingCanteen(null);
        fetchCanteens();
      } else {
        const data = await res.json();
        setError(data.error || 'Operation failed.');
      }
    } catch (err) {
      setError('Connection error.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading canteen list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pt-16 max-w-4xl mx-auto">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Manage Campus Canteens</h1>
          <p className="text-xs text-slate-500">Create canteens, assign active owners, and activate/deactivate locations.</p>
        </div>

        <button
          onClick={() => {
            setEditingCanteen(null);
            setName('');
            setLocation('');
            setStatus('LIVE');
            setSelectedOwnerId('unassigned');
            setShowModal(true);
          }}
          className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Create Canteen</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Canteens List */}
      <div className="grid gap-4 md:grid-cols-2">
        {canteens.map((canteen) => (
          <div key={canteen.id} className="surface-card p-5 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{canteen.name}</h3>
                <p className="text-xs font-medium text-slate-500">{canteen.location}</p>
              </div>
              <span className={`status-badge ${canteen.status === 'LIVE' ? 'status-live' : 'status-paused'}`}>
                {canteen.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold space-y-1">
              <div className="flex items-center justify-between text-slate-700">
                <span>Assigned Owner:</span>
                <span className="font-extrabold text-purple-900">
                  {canteen.owner ? canteen.owner.name : 'UNASSIGNED'}
                </span>
              </div>
              {canteen.owner && <div className="text-slate-400 text-[11px]">{canteen.owner.email}</div>}
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  setEditingCanteen(canteen);
                  setName(canteen.name);
                  setLocation(canteen.location);
                  setStatus(canteen.status);
                  setSelectedOwnerId(canteen.ownerId || 'unassigned');
                  setShowModal(true);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center gap-1 border border-slate-300"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit / Assign Owner</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900">{editingCanteen ? 'Edit Canteen' : 'Create New Canteen'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="text-xs font-bold text-red-600">{error}</div>}

            <form onSubmit={handleSaveCanteen} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Canteen Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Main Canteen"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Location / Block</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Block A - Ground Floor"
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assign Active Owner</label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                >
                  <option value="unassigned">-- Unassigned --</option>
                  {availableOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} ({owner.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
                >
                  <option value="LIVE">LIVE</option>
                  <option value="PAUSED">PAUSED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="SETUP">SETUP</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-sm mt-2"
              >
                Save Canteen
              </button>
            </form>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
