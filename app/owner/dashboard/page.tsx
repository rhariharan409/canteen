'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OwnerNav from '@/components/OwnerNav';
import { ShoppingCart, CheckCircle2, Clock, PackageCheck, AlertOctagon, ArrowRight, FileSpreadsheet, Play, Pause } from 'lucide-react';

interface DashboardData {
  canteen: {
    id: string;
    name: string;
    location: string;
    status: string;
    isPaused: boolean;
  };
  metrics: {
    todayOrders: number;
    ready: number;
    preparing: number;
    collected: number;
    capacityPercentage: number;
  };
  currentBatch: {
    id: string;
    windowLabel: string;
    totalOrders: number;
    preparing: number;
    ready: number;
    prepSummary: Record<string, number>;
  } | null;
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = () => {
    fetch('/api/owner/dashboard')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.error) {
          router.replace('/');
        } else {
          setData(resData);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000); // Efficient polling for realtime operational updates
    return () => clearInterval(interval);
  }, []);

  const handlePauseToggle = async () => {
    if (!data) return;
    setActionLoading(true);
    const nextAction = data.canteen.isPaused ? 'RESUME_ORDERS' : 'PAUSE_ORDERS';

    try {
      const res = await fetch('/api/owner/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      if (res.ok) fetchDashboard();
    } catch (e) {}
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading operational dashboard...</p>
      </div>
    );
  }

  if (!data) return null;

  const { canteen, metrics, currentBatch } = data;

  return (
    <div className="space-y-6 pb-20 md:pt-16">
      {/* Top Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold text-sky-600 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            {canteen.name}
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1 uppercase tracking-tight">OPERATIONAL DASHBOARD</h1>
          <p className="text-xs text-slate-500 font-medium">{canteen.location} • Realtime Status Overview</p>
        </div>

        {/* Large Pause / Resume Button */}
        <button
          onClick={handlePauseToggle}
          disabled={actionLoading}
          className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 ${
            canteen.isPaused
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          {canteen.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span>{canteen.isPaused ? 'RESUME NEW ORDERS' : 'PAUSE NEW ORDERS'}</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <ShoppingCart className="w-4 h-4 text-sky-600" />
            <span>Orders Today</span>
          </div>
          <div className="text-3xl font-black text-slate-900">{metrics.todayOrders}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Preparing</span>
          </div>
          <div className="text-3xl font-black text-amber-700">{metrics.preparing}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Ready</span>
          </div>
          <div className="text-3xl font-black text-emerald-700">{metrics.ready}</div>
        </div>

        <div className="surface-card p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase mb-1">
            <PackageCheck className="w-4 h-4 text-slate-600" />
            <span>Collected</span>
          </div>
          <div className="text-3xl font-black text-slate-700">{metrics.collected}</div>
        </div>
      </div>

      {/* Capacity Progress Bar Card */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="uppercase text-slate-700">Canteen Active Capacity Load</span>
          <span className="text-slate-900">{metrics.capacityPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all ${
              metrics.capacityPercentage > 85
                ? 'bg-red-500'
                : metrics.capacityPercentage > 60
                ? 'bg-amber-500'
                : 'bg-sky-600'
            }`}
            style={{ width: `${metrics.capacityPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Current Batch & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Batch Overview Card */}
        <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Current Pickup Batch</span>
              <h3 className="text-lg font-black text-slate-900">{currentBatch?.windowLabel || 'No Active Batches'}</h3>
            </div>
            <span className="status-badge status-live">{currentBatch?.totalOrders || 0} Orders</span>
          </div>

          {currentBatch && (
            <div className="space-y-3">
              <div className="flex gap-4 text-xs font-bold">
                <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  {currentBatch.preparing} Preparing
                </span>
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {currentBatch.ready} Ready
                </span>
              </div>

              {/* Prep Summary breakdown */}
              {Object.keys(currentBatch.prepSummary).length > 0 && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">Preparation Summary</div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {Object.entries(currentBatch.prepSummary).map(([item, count]) => (
                      <div key={item} className="text-xs font-semibold text-slate-800 flex justify-between bg-white px-2 py-1 rounded border border-slate-200">
                        <span>{item}</span>
                        <span className="font-extrabold text-sky-700">× {count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => router.push('/owner/orders')}
              className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <span>View Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => router.push('/owner/pickup')}
              className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <span>Pickup Verification</span>
            </button>
          </div>
        </div>

        {/* Quick Menu Setup & CSV Import Card */}
        <div className="surface-card p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sky-600 font-bold text-xs uppercase mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Menu & Stock Control</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Manage Canteen Operations</h3>
            <p className="text-xs text-slate-500 mt-1">
              Quickly import menu items via CSV template or adjust initial daily stock levels for peak breaks.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/owner/menu')}
              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 text-center"
            >
              Import CSV / Menu
            </button>
            <button
              onClick={() => router.push('/owner/stock')}
              className="py-3 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl border border-slate-300 text-center"
            >
              Set Today's Stock
            </button>
          </div>
        </div>
      </div>

      <OwnerNav />
    </div>
  );
}
