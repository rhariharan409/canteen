'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { QrCode, WifiOff, Clock, CheckCircle, Package, Utensils, AlertCircle } from 'lucide-react';

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

  useEffect(() => {
    // Listen for online/offline browser events
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Fetch from backend API
    fetch('/api/student/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.activeOrder) {
          setActiveOrder(data.activeOrder);
          setIsOffline(false);
          // Update offline cache
          try {
            localStorage.setItem('active_pickup_order', JSON.stringify(data.activeOrder));
          } catch (e) {}
        } else {
          loadOfflineCache();
        }
        setLoading(false);
      })
      .catch(() => {
        // Network unavailable -> read from local cache!
        loadOfflineCache();
        setLoading(false);
      });

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Fetching active pickup slip...</p>
      </div>
    );
  }

  if (!activeOrder) {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center py-12">
          <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900">No Active Pickup</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            You don't have an active pre-order. Place an order from any available canteen to get your pickup batch & OTP.
          </p>
          <button
            onClick={() => router.push('/student/home')}
            className="mt-5 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            Browse Canteens
          </button>
        </div>
        <StudentNav />
      </div>
    );
  }

  const stages = [
    { label: 'Payment', key: 'PAID' },
    { label: 'Confirmed', key: 'CONFIRMED' },
    { label: 'Preparing', key: 'PREPARING' },
    { label: 'Ready', key: 'READY' },
    { label: 'Collected', key: 'COLLECTED' },
  ];

  const currentStatusIndex = stages.findIndex((s) => s.key === activeOrder.orderStatus);

  return (
    <div className="space-y-4 pb-20">
      {/* Offline Banner */}
      {isOffline && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2 shadow-sm">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-600" />
          <span>Offline Mode — Showing cached pickup details locally stored on your device.</span>
        </div>
      )}

      {/* Main Pickup Slip Card */}
      <div className="surface-card p-6 rounded-2xl border border-slate-200 shadow-md space-y-6 bg-white text-center">
        {/* Header Canteen Name */}
        <div>
          <span className="text-[11px] font-extrabold text-sky-600 uppercase tracking-wider bg-sky-50 px-2.5 py-1 rounded-full border border-sky-100">
            {activeOrder.canteenName}
          </span>
          <h1 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
            ORDER {activeOrder.publicOrderCode}
          </h1>
          <div className="inline-block mt-2">
            <span
              className={`status-badge ${
                activeOrder.orderStatus === 'READY'
                  ? 'status-live animate-pulse'
                  : activeOrder.orderStatus === 'PREPARING'
                  ? 'status-paused'
                  : 'status-live'
              }`}
            >
              {activeOrder.orderStatus === 'READY' ? 'READY FOR PICKUP' : activeOrder.orderStatus}
            </span>
          </div>
        </div>

        {/* Assigned Pickup Window */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2">
          <Clock className="w-5 h-5 text-sky-600" />
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Assigned Pickup Window</div>
            <div className="text-base font-extrabold text-slate-800">{activeOrder.pickupWindow}</div>
          </div>
        </div>

        {/* Prominent OTP */}
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pickup OTP</div>
          <div className="otp-display shadow-inner">{activeOrder.otpCode || '----'}</div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Show this OTP at counter for instant verification.
          </p>
        </div>

        {/* Order State Progress Bar */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-700 text-left mb-3">Order Progress</div>
          <div className="flex items-center justify-between relative px-2">
            {stages.map((stage, idx) => {
              const isPassed = idx <= (currentStatusIndex >= 0 ? currentStatusIndex : 1);
              return (
                <div key={stage.key} className="flex flex-col items-center z-10">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isPassed ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isPassed ? '✓' : idx + 1}
                  </div>
                  <span
                    className={`text-[9px] mt-1 font-bold ${
                      isPassed ? 'text-sky-700' : 'text-slate-400'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Items Summary */}
        <div className="pt-3 border-t border-slate-100 text-left">
          <div className="text-xs font-bold text-slate-700 mb-2">Order Items ({activeOrder.items.length})</div>
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {activeOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-semibold text-slate-800">
                <span>
                  {item.itemName || item.name} × {item.quantity}
                </span>
                <span>₹{(item.unitPrice || 0) * item.quantity}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Paid</span>
              <span>₹{activeOrder.subtotal}</span>
            </div>
          </div>
        </div>
      </div>

      <StudentNav />
    </div>
  );
}
