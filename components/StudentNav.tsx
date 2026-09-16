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
    <nav className="fixed bottom-3 left-4 right-4 z-50 max-w-md mx-auto bg-white border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] p-1.5">
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center py-1.5 px-3 border-2 transition-all ${
                isActive
                  ? 'bg-neoPrimary text-neoBlack border-neoBlack shadow-[2px_2px_0px_0px_#111111] font-black'
                  : 'bg-white border-transparent text-slate-700 hover:border-neoBlack'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] font-extrabold uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
