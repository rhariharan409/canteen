'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { Search, ShoppingBag, ArrowLeft, Plus, Minus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  currentStock: number;
  stockMode: string;
  isAvailable: boolean;
}

interface CanteenDetail {
  id: string;
  name: string;
  location: string;
  status: string;
  isPaused: boolean;
}

export default function StudentCanteenMenuPage() {
  const router = useRouter();
  const params = useParams();
  const canteenId = params.id as string;

  const [canteen, setCanteen] = useState<CanteenDetail | null>(null);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/student/canteens/${canteenId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setCanteen(data.canteen);
          setCategories(data.categories || ['All']);
          setMenuItems(data.menuItems || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load menu.');
        setLoading(false);
      });
  }, [canteenId]);

  const updateQuantity = (itemId: string, delta: number, maxStock: number) => {
    setCart((prev) => {
      const currentQty = prev[itemId] || 0;
      const nextQty = currentQty + delta;

      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }

      if (nextQty > maxStock) {
        setError(`Cannot add more than ${maxStock} items available in stock.`);
        setTimeout(() => setError(''), 3000);
        return prev;
      }

      return { ...prev, [itemId]: nextQty };
    });
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartItemCount = Object.values(cart).reduce((acc, q) => acc + q, 0);

  const cartSubtotal = Object.entries(cart).reduce((acc, [itemId, qty]) => {
    const item = menuItems.find((i) => i.id === itemId);
    return acc + (item ? item.price * qty : 0);
  }, 0);

  const handleCheckout = async () => {
    if (cartItemCount === 0) return;
    setError('');
    setCheckoutSubmitting(true);

    try {
      const cartItemsPayload = Object.entries(cart).map(([menuItemId, quantity]) => ({
        menuItemId,
        quantity,
      }));

      const res = await fetch('/api/student/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canteenId,
          cartItems: cartItemsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Checkout failed.');
        setCheckoutSubmitting(false);
        return;
      }

      // Cache active order payload into localStorage for offline availability!
      try {
        localStorage.setItem('active_pickup_order', JSON.stringify(data.order));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }

      // Redirect student directly to active pickup slip screen
      router.push('/student/pickup');
    } catch (err: any) {
      setError('Checkout error. Please check your connection.');
      setCheckoutSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Fetching menu & live stock...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => router.push('/student/home')}
          className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{canteen?.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`status-badge ${canteen?.isPaused ? 'status-paused' : 'status-live'}`}>
              {canteen?.isPaused ? 'PAUSED' : 'OPEN'}
            </span>
            <span className="text-xs text-slate-500">{canteen?.location}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search food..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
      </div>

      {/* Dynamic Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Cards List */}
      <div className="grid gap-3 md:grid-cols-2">
        {filteredItems.map((item) => {
          const qtyInCart = cart[item.id] || 0;
          const isSoldOut = item.currentStock <= 0;

          return (
            <div
              key={item.id}
              className={`surface-card p-4 rounded-xl border flex items-center justify-between gap-3 ${
                isSoldOut ? 'bg-slate-50 opacity-75' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-base font-bold text-slate-900 truncate">{item.name}</h4>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    {item.category}
                  </span>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-500 line-clamp-1 mb-1">{item.description}</p>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-base font-extrabold text-slate-900">₹{item.price}</span>
                  {!isSoldOut ? (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Available: {item.currentStock}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md uppercase">
                      SOLD OUT
                    </span>
                  )}
                </div>
              </div>

              {/* Quantity Selector or Sold Out indicator */}
              <div className="shrink-0">
                {!isSoldOut && !canteen?.isPaused ? (
                  qtyInCart === 0 ? (
                    <button
                      onClick={() => updateQuantity(item.id, 1, item.currentStock)}
                      className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold border border-sky-200 rounded-xl text-xs transition-colors"
                    >
                      ADD
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-sky-600 text-white rounded-xl p-1 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.id, -1, item.currentStock)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-sky-700 rounded-lg text-white font-bold"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-extrabold text-sm w-4 text-center">{qtyInCart}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1, item.currentStock)}
                        className="w-7 h-7 flex items-center justify-center hover:bg-sky-700 rounded-lg text-white font-bold"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )
                ) : (
                  <span className="text-xs font-bold text-slate-400 bg-slate-200 px-3 py-1.5 rounded-xl">
                    UNAVAILABLE
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 md:max-w-md md:mx-auto z-40 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between border border-slate-800">
          <div>
            <div className="text-xs font-semibold text-slate-400">
              {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in order
            </div>
            <div className="text-lg font-extrabold">₹{cartSubtotal}</div>
          </div>
          <button
            onClick={handleCheckout}
            disabled={checkoutSubmitting || canteen?.isPaused}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {checkoutSubmitting ? (
              <span>Processing...</span>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Pay & Pre-Order</span>
              </>
            )}
          </button>
        </div>
      )}

      <StudentNav />
    </div>
  );
}
