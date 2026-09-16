'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoBadge } from '@/components/neo/NeoBadge';
import { NeoInput } from '@/components/neo/NeoInput';
import { Search, ShoppingBag, ArrowLeft, Plus, Minus, AlertCircle, Clock } from 'lucide-react';

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
        setError('Failed to load canteen menu.');
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
        setError(`Cannot add more than ${maxStock} units available in stock.`);
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
        console.warn('LocalStorage caching error:', e);
      }

      router.push('/student/pickup');
    } catch (err: any) {
      setError('Connection error. Please try again.');
      setCheckoutSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">FETCHING MENU & LIVE STOCK...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-32">
      {/* Canteen Header */}
      <div className="bg-neoBlack text-white p-4 border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#D9FF00] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/student/home')}
            className="p-2 bg-neoPrimary text-neoBlack border-2 border-neoBlack hover:bg-yellow-300 font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black font-display uppercase tracking-tight">{canteen?.name}</h1>
            <p className="text-xs font-bold text-slate-300">{canteen?.location}</p>
          </div>
        </div>
        <NeoBadge variant={canteen?.isPaused ? 'paused' : 'live'}>
          {canteen?.isPaused ? 'PAUSED' : 'OPEN'}
        </NeoBadge>
      </div>

      {error && (
        <div className="p-3 bg-neoDanger text-white border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input */}
      <NeoInput
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="SEARCH FOOD..."
      />

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-neoBlack transition-all ${
              activeCategory === cat
                ? 'bg-neoPrimary text-neoBlack shadow-[2px_2px_0px_0px_#111111]'
                : 'bg-white text-slate-700 hover:bg-slate-100 shadow-[2px_2px_0px_0px_#111111]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Food Items List */}
      <div className="grid gap-3 md:grid-cols-2">
        {filteredItems.map((item) => {
          const qtyInCart = cart[item.id] || 0;
          const isSoldOut = item.currentStock <= 0;

          return (
            <NeoCard
              key={item.id}
              className={`flex items-center justify-between gap-3 ${
                isSoldOut ? 'bg-slate-100 opacity-80' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-lg font-black font-display uppercase text-neoBlack truncate">{item.name}</h4>
                  <span className="text-[9px] font-black uppercase bg-slate-200 text-slate-800 px-1.5 py-0.5 border border-neoBlack">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xl font-black font-mono text-neoBlack">₹{item.price}</span>
                  {!isSoldOut ? (
                    <span className="text-xs font-black uppercase text-neoBlack bg-neoPrimary px-2 py-0.5 border border-neoBlack">
                      {item.currentStock} LEFT
                    </span>
                  ) : (
                    <NeoBadge variant="soldout">SOLD OUT</NeoBadge>
                  )}
                </div>
              </div>

              {/* Quantity Selector / Add Button */}
              <div className="shrink-0">
                {!isSoldOut && !canteen?.isPaused ? (
                  qtyInCart === 0 ? (
                    <NeoButton
                      onClick={() => updateQuantity(item.id, 1, item.currentStock)}
                      variant="primary"
                      size="sm"
                    >
                      ADD TO CART
                    </NeoButton>
                  ) : (
                    <div className="flex items-center gap-2 bg-neoBlack text-white p-1 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#D9FF00]">
                      <button
                        onClick={() => updateQuantity(item.id, -1, item.currentStock)}
                        className="w-7 h-7 flex items-center justify-center bg-neoBlack text-neoPrimary hover:bg-slate-800 font-black text-base border border-neoPrimary"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-mono font-black text-sm text-neoPrimary px-1">{qtyInCart}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1, item.currentStock)}
                        className="w-7 h-7 flex items-center justify-center bg-neoBlack text-neoPrimary hover:bg-slate-800 font-black text-base border border-neoPrimary"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )
                ) : (
                  <span className="text-xs font-black text-slate-500 bg-slate-200 px-3 py-1.5 border-2 border-slate-400">
                    UNAVAILABLE
                  </span>
                )}
              </div>
            </NeoCard>
          );
        })}
      </div>

      {/* Floating Bottom Cart Sheet Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 md:max-w-md md:mx-auto z-40 bg-neoBlack text-white p-4 border-2.5 border-neoBlack shadow-[6px_6px_0px_0px_#D9FF00] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-black uppercase text-slate-400">
              {cartItemCount} {cartItemCount === 1 ? 'ITEM' : 'ITEMS'} IN CART
            </div>
            <div className="text-2xl font-black font-mono text-neoPrimary">₹{cartSubtotal}</div>
          </div>

          <NeoButton
            onClick={handleCheckout}
            disabled={checkoutSubmitting || canteen?.isPaused}
            variant="primary"
            size="md"
          >
            {checkoutSubmitting ? (
              <span>PROCESSING...</span>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>PLACE ORDER →</span>
              </>
            )}
          </NeoButton>
        </div>
      )}

      <StudentNav />
    </div>
  );
}
