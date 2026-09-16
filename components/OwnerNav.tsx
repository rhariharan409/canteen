'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Utensils, Package, QrCode } from 'lucide-react';

export default function OwnerNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/owner/orders', icon: ShoppingCart },
    { label: 'Menu', href: '/owner/menu', icon: Utensils },
    { label: 'Stock', href: '/owner/stock', icon: Package },
    { label: 'Pickup', href: '/owner/pickup', icon: QrCode },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white z-50 py-2.5 px-4 shadow-xl md:top-0 md:bottom-auto md:py-3 md:px-8 border-t md:border-t-0 md:border-b border-slate-800">
      <div className="max-w-6xl mx-auto flex justify-around md:justify-between items-center">
        <div className="hidden md:flex items-center gap-2 font-black text-sm text-sky-400">
          <Utensils className="w-5 h-5 text-sky-400" />
          <span>CANTEEN OWNER DASHBOARD</span>
        </div>
        <div className="flex items-center gap-1 md:gap-4 w-full md:w-auto justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col md:flex-row items-center gap-1 py-1 px-3 rounded-xl transition-all ${
                  isActive ? 'text-white font-bold bg-sky-600' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
