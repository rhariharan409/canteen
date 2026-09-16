'use client';

import { useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import { BarChart3, TrendingUp, Store, ShoppingBag } from 'lucide-react';

export default function AdminReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Aggregating platform reports...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 pb-20 md:pt-16 max-w-4xl mx-auto">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">System Analytics & Reports</h1>
        <p className="text-xs text-slate-500">Realtime database breakdown of orders and revenue across canteens.</p>
      </div>

      {/* Orders By Canteen Breakdown */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase">Canteen Performance Breakdown</h3>

        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(data.ordersByCanteen || {}).map(([canteenName, metrics]: [string, any]) => (
            <div key={canteenName} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="text-sm font-black text-slate-900">{canteenName}</div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 pt-1">
                <span>Total Orders: <strong className="text-slate-900">{metrics.count}</strong></span>
                <span>Revenue: <strong className="text-emerald-700">₹{metrics.revenue}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Items */}
      <div className="surface-card p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase">Top Ordered Campus Items</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(data.popularItems || {}).map(([itemName, count]: [string, any]) => (
            <div key={itemName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold flex justify-between">
              <span className="truncate">{itemName}</span>
              <span className="text-sky-700 font-extrabold">× {count}</span>
            </div>
          ))}
        </div>
      </div>

      <AdminNav />
    </div>
  );
}
