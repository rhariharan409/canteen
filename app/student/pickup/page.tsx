'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoBadge } from '@/components/neo/NeoBadge';
import { QrCode, WifiOff, Clock, CheckCircle, Package, Utensils, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ActiveOrder {
  id: string;
  publicOrderCode: string;
  canteenName: string;
  canteenLocation?: string;
  pickupWindow: string;
  otpCode: string | null;
  orderStatus: string;
  subtotal: number;
  items: Array<{
    itemName?: string;
    name?: string;
    unitPrice: number;
    quantity: number;
  }>;
  confirmedAt?: string;
}

export default function StudentPickupPage() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadOfflineCache = () => {
    try {
      const cached = localStorage.getItem('active_pickup_order');
      if (cached) {
        setActiveOrder(JSON.parse(cached));
        setIsOffline(true);
      }
    } catch (e) {
      console.warn('Failed to load local offline order cache:', e);
    }
  };

  const fetchActiveOrder = () => {
    fetch('/api/student/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeOrder) {
          setActiveOrder(data.activeOrder);
          setIsOffline(false);
          try {
            localStorage.setItem('active_pickup_order', JSON.stringify(data.activeOrder));
          } catch (e) {}
        } else {
          loadOfflineCache();
        }
        setLoading(false);
      })
      .catch(() => {
        loadOfflineCache();
        setLoading(false);
      });
  };

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    fetchActiveOrder();

    // Supabase Realtime subscription for live order status changes!
    const channel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          if (activeOrder && payload.new && payload.new.id === activeOrder.id) {
            setActiveOrder((prev) =>
              prev ? { ...prev, orderStatus: payload.new.status } : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">LOADING ACTIVE PICKUP SLIP...</p>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="space-y-6 pb-24">
        <NeoCard className="text-center py-12 space-y-4">
          <QrCode className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-black font-display uppercase text-neoBlack">NO ACTIVE PICKUP</h2>
          <p className="text-xs font-bold text-slate-600 max-w-xs mx-auto">
            You don't have an active pre-order. Place an order from any canteen to get your pickup batch & OTP.
          </p>
          <NeoButton onClick={() => router.push('/student/home')} variant="primary" size="md">
            BROWSE CANTEENS →
          </NeoButton>
        </NeoCard>
        <StudentNav />
      </div>
    );
  }

  const stages = [
    { label: 'PAID', key: 'PAID' },
    { label: 'CONFIRMED', key: 'CONFIRMED' },
    { label: 'PREPARING', key: 'PREPARING' },
    { label: 'READY', key: 'READY' },
    { label: 'COLLECTED', key: 'COLLECTED' },
  ];

  const currentStatusIndex = stages.findIndex((s) => s.key === activeOrder.orderStatus);

  return (
    <div className="space-y-4 pb-24">
      {/* Offline Mode Banner */}
      {isOffline && (
        <div className="p-3 bg-neoSecondary text-white border-2.5 border-neoBlack shadow-[3px_3px_0px_0px_#111111] text-xs font-black flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>OFFLINE MODE — Showing last saved order information from device storage.</span>
        </div>
      )}

      {/* Main Neo Active Order Slip */}
      <NeoCard className="text-center space-y-6 bg-white border-3">
        {/* Header Canteen Name */}
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-neoBlack bg-neoPrimary px-3 py-1 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111]">
            {activeOrder.canteenName}
          </span>
          <h1 className="text-4xl font-black font-display text-neoBlack uppercase tracking-tight mt-3">
            {activeOrder.publicOrderCode}
          </h1>
          <div className="inline-block mt-2">
            <NeoBadge
              variant={
                activeOrder.orderStatus === 'READY'
                  ? 'ready'
                  : activeOrder.orderStatus === 'PREPARING'
                  ? 'preparing'
                  : 'live'
              }
            >
              {activeOrder.orderStatus === 'READY' ? 'ORDER READY FOR PICKUP' : activeOrder.orderStatus}
            </NeoBadge>
          </div>
        </div>

        {/* Pickup Window */}
        <div className="p-3 bg-amber-50 border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-neoBlack" />
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-600">ASSIGNED PICKUP WINDOW</div>
            <div className="text-lg font-black font-mono text-neoBlack">{activeOrder.pickupWindow}</div>
          </div>
        </div>

        {/* Giant OTP */}
        <div className="space-y-1">
          <div className="text-xs font-black uppercase tracking-widest text-slate-600">PICKUP OTP</div>
          <div className="text-4xl font-black font-mono tracking-widest text-neoBlack bg-neoPrimary p-4 border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] inline-block">
            {activeOrder.otpCode || '----'}
          </div>
          <p className="text-[11px] font-bold text-slate-600 mt-2">
            Show this OTP at canteen counter for instant verification.
          </p>
        </div>

        {/* Order Progress Indicator */}
        <div className="pt-3 border-t-2 border-neoBlack">
          <div className="text-xs font-black uppercase tracking-wider text-neoBlack text-left mb-3">
            ORDER STATUS PROGRESS
          </div>
          <div className="flex items-center justify-between relative px-2">
            {stages.map((stage, idx) => {
              const isPassed = idx <= (currentStatusIndex >= 0 ? currentStatusIndex : 1);
              return (
                <div key={stage.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-7 h-7 border-2 border-neoBlack font-black text-xs flex items-center justify-center ${
                      isPassed ? 'bg-neoPrimary text-neoBlack shadow-[2px_2px_0px_0px_#111111]' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase mt-1 ${
                      isPassed ? 'text-neoBlack' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items Breakdown */}
        <div className="pt-3 border-t-2 border-neoBlack text-left">
          <div className="text-xs font-black uppercase text-neoBlack mb-2">ORDER ITEMS SUMMARY</div>
          <div className="space-y-1.5 bg-slate-50 p-3 border-2 border-neoBlack">
            {activeOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-bold text-neoBlack">
                <span>
                  {item.itemName || item.name} × {item.quantity}
                </span>
                <span className="font-mono">₹{(item.unitPrice || 0) * item.quantity}</span>
              </div>
            ))}
            <div className="pt-2 border-t-2 border-neoBlack flex justify-between text-sm font-black text-neoBlack">
              <span>TOTAL PAID</span>
              <span className="font-mono">₹{activeOrder.subtotal}</span>
            </div>
          </div>
        </div>
      </NeoCard>

      <StudentNav />
    </div>
  );
}
