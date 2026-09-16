'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import { UserCheck, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface OwnerUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  canteens: Array<{ id: string; name: string }>;
}

export default function AdminOwnersPage() {
  const [pending, setPending] = useState<OwnerUser[]>([]);
  const [active, setActive] = useState<OwnerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchOwners = () => {
    fetch('/api/admin/owners')
      .then((res) => res.json())
      .then((data) => {
        setPending(data.pending || []);
        setActive(data.active || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOwners();
  }, []);

  const handleAction = async (ownerId: string, action: 'APPROVE' | 'SUSPEND') => {
    setMessage('');
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchOwners();
      }
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading owner accounts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pt-16 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Owner Accounts & Approvals</h1>
        <p className="text-xs text-slate-500">Manage owner access permissions and view assigned canteens.</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="surface-card p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-3">
          <h3 className="text-sm font-extrabold text-amber-900 uppercase">Pending Approval ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((o) => (
              <div key={o.id} className="p-3.5 bg-white border border-amber-200 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{o.name}</h4>
                  <div className="text-xs text-slate-500">{o.email} • {o.phone || 'No phone'}</div>
                </div>
                <button
                  onClick={() => handleAction(o.id, 'APPROVE')}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Owners List */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase">Active Owners ({active.length})</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((o) => (
            <div key={o.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">{o.name}</h4>
                <div className="text-xs text-slate-500">{o.email}</div>
                <div className="text-[11px] font-bold text-purple-900 mt-1">
                  Canteen: {o.canteens[0]?.name || 'Unassigned'}
                </div>
              </div>
              <button
                onClick={() => handleAction(o.id, 'SUSPEND')}
                className="px-3 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-xs rounded-lg"
              >
                Suspend
              </button>
            </div>
          ))}
        </div>
      </div>

      <AdminNav />
    </div>
  );
}
