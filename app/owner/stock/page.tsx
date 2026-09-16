'use client';

import { useEffect, useState } from 'react';
import OwnerNav from '@/components/OwnerNav';
import { Package, Plus, Minus, CheckCircle2, AlertCircle, Save } from 'lucide-react';

interface StockItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stockMode: string;
  currentStock: number;
  active: boolean;
}

export default function OwnerStockManagementPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStock = () => {
    fetch('/api/owner/stock')
      .then((res) => res.json())
      .then((data) => {
        const fetchedItems: StockItem[] = data.items || [];
        setItems(fetchedItems);

        const initialMap: Record<string, number> = {};
        fetchedItems.forEach((i) => {
          initialMap[i.id] = i.currentStock;
        });
        setStockInputs(initialMap);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const handleStockChange = (itemId: string, val: number) => {
    const cleanVal = Math.max(0, val);
    setStockInputs((prev) => ({ ...prev, [itemId]: cleanVal }));
  };

  const handleSaveItemStock = async (itemId: string) => {
    const targetStock = stockInputs[itemId] ?? 0;
    setSavingItemId(itemId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/owner/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, newStock: targetStock }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`Updated stock for item!`);
        fetchStock();
      } else {
        setError(data.error || 'Update failed.');
      }
    } catch (err) {
      setError('Connection error.');
    }
    setSavingItemId(null);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading stock balances...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pt-16 max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Today's Daily Stock Management</h1>
          <p className="text-xs text-slate-500">Set initial daily stock balances. Pre-orders deduct automatically.</p>
        </div>
        <button
          onClick={fetchStock}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Items Stock List */}
      <div className="space-y-3">
        {items.map((item) => {
          const currentVal = stockInputs[item.id] ?? item.currentStock;
          const isSoldOut = currentVal <= 0;

          return (
            <div key={item.id} className="surface-card p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{item.name}</h3>
                  <span className="text-[10px] font-extrabold uppercase bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md">
                    {item.stockMode}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                  <span>Category: {item.category}</span>
                  <span>₹{item.price}</span>
                  <span className={`font-bold ${isSoldOut ? 'text-red-600' : 'text-emerald-700'}`}>
                    Status: {isSoldOut ? 'Sold Out' : 'Available'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => handleStockChange(item.id, currentVal - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    value={currentVal}
                    onChange={(e) => handleStockChange(item.id, parseInt(e.target.value) || 0)}
                    className="w-16 py-1 bg-white border border-slate-200 rounded-lg text-center font-extrabold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />

                  <button
                    onClick={() => handleStockChange(item.id, currentVal + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => handleSaveItemStock(item.id)}
                  disabled={savingItemId === item.id}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingItemId === item.id ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <OwnerNav />
    </div>
  );
}
