'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Clock, QrCode, User } from 'lucide-react';

export default function StudentNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'HOME', href: '/student/home', icon: Home },
    { label: 'ORDERS', href: '/student/orders', icon: Clock },
    { label: 'PICKUP', href: '/student/pickup', icon: QrCode },
    { label: 'PROFILE', href: '/student/profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 py-2 px-4 shadow-lg md:max-w-md md:mx-auto md:bottom-4 md:rounded-2xl md:border">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-sky-600 font-bold bg-sky-50' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
