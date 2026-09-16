'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { Store, UserCheck, ShoppingBag, DollarSign, ArrowRight, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

interface PendingOwner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingOwners, setPendingOwners] = useState<PendingOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAdminData = () => {
    Promise.all([
      fetch('/api/admin/reports').then((r) => r.json()),
      fetch('/api/admin/owners').then((r) => r.json()),
    ])
      .then(([repData, ownerData]) => {
        if (repData.error || ownerData.error) {
          router.replace('/');
        } else {
          setMetrics(repData.summary);
          setPendingOwners(ownerData.pending || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleOwnerAction = async (ownerId: string, action: 'APPROVE' | 'REJECT') => {
    setActionLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || 'Action completed.');
        fetchAdminData();
      }
    } catch (e) {}
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading platform admin metrics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pt-16">
      {/* Top Header */}
      <div className="bg-purple-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-800 px-2.5 py-1 rounded-full border border-purple-700">
            SYSTEM ADMIN CONSOLE
          </span>
          <h1 className="text-2xl font-black mt-1 tracking-tight">CAMPUS NETWORK OVERVIEW</h1>
          <p className="text-xs text-purple-200">Global canteens, owner approvals, and order monitoring</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <Store className="w-4 h-4 text-purple-600" />
            <span>Total Canteens</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics?.totalCanteens || 0}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Active Owners</span>
          </div>
          <div className="text-3xl font-black text-emerald-700">{metrics?.totalOwners || 0}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <ShoppingBag className="w-4 h-4 text-sky-600" />
            <span>Total Orders</span>
          </div>
          <div className="text-3xl font-black text-sky-700">{metrics?.totalOrders || 0}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span>Network Revenue</span>
          </div>
          <div className="text-3xl font-black text-slate-900">₹{metrics?.totalRevenue || 0}</div>
        </div>
      </div>

      {/* Pending Owner Requests */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Pending Owner Onboarding Requests</h3>
            <p className="text-xs text-slate-500">Owners are NOT self-approved. Verify credentials before approving.</p>
          </div>
          <span className="status-badge status-paused">{pendingOwners.length} Pending</span>
        </div>

        {pendingOwners.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 font-medium">
            No pending owner requests at this time.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOwners.map((owner) => (
              <div key={owner.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">{owner.name}</h4>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Email: {owner.email} • Phone: {owner.phone || 'N/A'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOwnerAction(owner.id, 'REJECT')}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 rounded-lg flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleOwnerAction(owner.id, 'APPROVE')}
                    disabled={actionLoading}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Owner</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdminNav />
    </div>
  );
}
