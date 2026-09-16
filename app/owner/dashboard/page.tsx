'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OwnerNav from '@/components/OwnerNav';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoStat } from '@/components/neo/NeoStat';
import { ShoppingCart, CheckCircle2, Clock, PackageCheck, ArrowRight, Play, Pause, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
          console.warn('Dashboard response error:', resData.error);
        }
        if (resData.canteen) {
          setData(resData);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch dashboard failed:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Supabase Realtime channel for live operational updates!
    const channel = supabase
      .channel('public:orders:owner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDashboard();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
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
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">LOADING OPERATIONAL CONTROL PANEL...</p>
      </div>
    );
  }

  if (!data) return null;

  const { canteen, metrics, currentBatch } = data;

  return (
    <div className="space-y-6 pb-24 md:pt-16">
      {/* Top Banner */}
      <div className="bg-neoBlack text-white p-6 border-2.5 border-neoBlack shadow-[6px_6px_0px_0px_#D9FF00] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neoBlack bg-neoPrimary px-2.5 py-1 border border-neoBlack">
            {canteen.name}
          </span>
          <h1 className="text-3xl font-black font-display tracking-tight text-white uppercase mt-1">
            LIVE OPERATIONAL CONTROL
          </h1>
          <p className="text-xs font-bold text-slate-300">{canteen.location} • Realtime Kitchen Overview</p>
        </div>

        <NeoButton
          onClick={handlePauseToggle}
          disabled={actionLoading}
          variant={canteen.isPaused ? 'success' : 'secondary'}
          size="md"
        >
          {canteen.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          <span>{canteen.isPaused ? 'RESUME ORDERS' : 'PAUSE ORDERS'}</span>
        </NeoButton>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NeoStat label="TODAY ORDERS" value={metrics.todayOrders} accentBg="bg-white" />
        <NeoStat label="PREPARING" value={metrics.preparing} accentBg="bg-amber-300" />
        <NeoStat label="READY FOR PICKUP" value={metrics.ready} accentBg="bg-neoPrimary" />
        <NeoStat label="COLLECTED" value={metrics.collected} accentBg="bg-slate-200" />
      </div>

      {/* Capacity Progress Bar */}
      <NeoCard className="space-y-2">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="uppercase text-neoBlack">CANTEEN ACTIVE CAPACITY LOAD</span>
          <span className="font-mono text-base font-black text-neoBlack">{metrics.capacityPercentage}%</span>
        </div>
        <div className="w-full bg-white h-4 border-2 border-neoBlack overflow-hidden">
          <div
            className={`h-full transition-all ${
              metrics.capacityPercentage > 85
                ? 'bg-neoDanger'
                : metrics.capacityPercentage > 60
                ? 'bg-amber-400'
                : 'bg-neoPrimary'
            }`}
            style={{ width: `${metrics.capacityPercentage}%` }}
          ></div>
        </div>
      </NeoCard>

      {/* Current Batch & Operational Shortcuts */}
      <div className="grid md:grid-cols-2 gap-4">
        <NeoCard className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-neoBlack pb-3">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-600">CURRENT PICKUP BATCH</span>
              <h3 className="text-xl font-black font-display text-neoBlack">
                {currentBatch?.windowLabel || 'NO ACTIVE BATCH'}
              </h3>
            </div>
            <span className="text-xs font-black uppercase bg-neoPrimary px-2.5 py-1 border border-neoBlack">
              {currentBatch?.totalOrders || 0} ORDERS
            </span>
          </div>

          {currentBatch && (
            <div className="space-y-3">
              <div className="flex gap-3 text-xs font-extrabold">
                <span className="bg-amber-200 text-neoBlack px-2.5 py-1 border border-neoBlack">
                  {currentBatch.preparing} PREPARING
                </span>
                <span className="bg-neoPrimary text-neoBlack px-2.5 py-1 border border-neoBlack">
                  {currentBatch.ready} READY
                </span>
              </div>

              {/* Prep Summary breakdown */}
              {Object.keys(currentBatch.prepSummary).length > 0 && (
                <div className="bg-amber-50 p-3 border-2 border-neoBlack space-y-1">
                  <div className="text-[11px] font-black uppercase text-neoBlack">KITCHEN PREPARATION SUMMARY</div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {Object.entries(currentBatch.prepSummary).map(([item, count]) => (
                      <div key={item} className="text-xs font-extrabold text-neoBlack flex justify-between bg-white p-1.5 border border-neoBlack">
                        <span>{item}</span>
                        <span className="font-mono text-neoSecondary">× {count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <NeoButton onClick={() => router.push('/owner/orders')} variant="primary" size="sm" className="flex-1">
              <span>LIVE ORDERS BOARD</span>
              <ArrowRight className="w-4 h-4" />
            </NeoButton>
            <NeoButton onClick={() => router.push('/owner/pickup')} variant="dark" size="sm" className="flex-1">
              <span>VERIFY OTP</span>
            </NeoButton>
          </div>
        </NeoCard>

        {/* Quick Menu & Stock Control Card */}
        <NeoCard className="flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase text-neoBlack mb-1">
              <FileSpreadsheet className="w-4 h-4 text-neoSecondary" />
              <span>MENU CATALOG & STOCK CONTROL</span>
            </div>
            <h3 className="text-xl font-black font-display text-neoBlack uppercase">MANAGE CANTEEN OPERATIONAL DATA</h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Upload CSV menu items or adjust daily available stock counts for peak break hours.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NeoButton onClick={() => router.push('/owner/menu')} variant="outline" size="sm">
              IMPORT CSV / MENU
            </NeoButton>
            <NeoButton onClick={() => router.push('/owner/stock')} variant="outline" size="sm">
              SET TODAY'S STOCK
            </NeoButton>
          </div>
        </NeoCard>
      </div>

      <OwnerNav />
    </div>
  );
}
