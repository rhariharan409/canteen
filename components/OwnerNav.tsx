'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, Utensils, Package, QrCode } from 'lucide-react';

export default function OwnerNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'DASHBOARD', href: '/owner/dashboard', icon: LayoutDashboard },
    { label: 'ORDERS', href: '/owner/orders', icon: ShoppingCart },
    { label: 'MENU', href: '/owner/menu', icon: Utensils },
    { label: 'STOCK', href: '/owner/stock', icon: Package },
    { label: 'PICKUP', href: '/owner/pickup', icon: QrCode },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-neoBlack text-white z-50 p-2 md:top-0 md:bottom-auto md:py-2.5 md:px-8 border-t-2.5 border-neoBlack shadow-[0px_-4px_0px_0px_#D9FF00] md:shadow-[0px_4px_0px_0px_#D9FF00]">
      <div className="max-w-6xl mx-auto flex justify-around md:justify-between items-center">
        <div className="hidden md:flex items-center gap-2 font-black text-sm text-neoPrimary font-display">
          <Utensils className="w-5 h-5 text-neoPrimary" />
          <span>iCAMPUS OWNER CONSOLE</span>
        </div>
        <div className="flex items-center gap-1 md:gap-3 w-full md:w-auto justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col md:flex-row items-center gap-1 py-1 px-3 border-2 transition-all ${
                  isActive
                    ? 'bg-neoPrimary text-neoBlack border-neoBlack font-black shadow-[2px_2px_0px_0px_#FFFFFF]'
                    : 'bg-neoBlack text-slate-300 border-transparent hover:text-white hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px] md:text-xs font-extrabold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
