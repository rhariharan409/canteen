'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { User, LogOut, ShieldCheck, Mail, Phone } from 'lucide-react';

export default function StudentProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) router.replace('/');
        else setUser(data.user);
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    try {
      localStorage.removeItem('active_pickup_order');
    } catch (e) {}
    router.replace('/');
  };

  if (!user) return null;

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-sky-100 text-sky-700 font-black text-2xl rounded-full mx-auto flex items-center justify-center border-2 border-sky-200 shadow-inner mb-3">
          {user.name.charAt(0)}
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">{user.name}</h1>
        <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider mt-0.5">{user.role}</p>
      </div>

      <div className="surface-card p-4 rounded-xl border space-y-3">
        <div className="flex items-center gap-3 text-xs">
          <Mail className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Email Address</div>
            <div className="font-semibold text-slate-800">{user.email}</div>
          </div>
        </div>

        {user.phone && (
          <div className="flex items-center gap-3 text-xs pt-2 border-t border-slate-100">
            <Phone className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</div>
              <div className="font-semibold text-slate-800">{user.phone}</div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out</span>
      </button>

      <StudentNav />
    </div>
  );
}
