'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoBadge } from '@/components/neo/NeoBadge';
import { Store, ChevronRight, AlertCircle, Sparkles } from 'lucide-react';

interface Canteen {
  id: string;
  name: string;
  location: string;
  status: string;
  availableItemCount: number;
  totalItemCount: number;
  estimatedPickupLoad: string;
  loadPercentage: number;
}

export default function StudentHomePage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.json()),
      fetch('/api/student/canteens').then((r) => r.json()),
    ])
      .then(([userData, canteenData]) => {
        if (!userData.authenticated) {
          router.replace('/');
          return;
        }
        setUserName(userData.user.name);

        if (canteenData.error) {
          setError(canteenData.error);
        } else {
          setCanteens(canteenData.canteens || []);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to connect to campus network.');
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">FETCHING CANTEENS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Banner Header */}
      <div className="bg-neoBlack text-white p-6 border-2.5 border-neoBlack shadow-[6px_6px_0px_0px_#D9FF00]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neoPrimary bg-slate-900 px-2 py-0.5 border border-neoPrimary">
              PRE-ORDER PLATFORM
            </span>
            <h1 className="text-3xl font-black font-display tracking-tight text-white uppercase mt-1 leading-none">
              ORDER BEFORE THE RUSH.
            </h1>
            <p className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-wider">
              Pre-order. Pay. Pick up in seconds.
            </p>
          </div>
        </div>
      </div>

      {/* Greeting Banner */}
      <div className="bg-neoPrimary border-2.5 border-neoBlack p-4 shadow-[4px_4px_0px_0px_#111111] flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-neoBlack">STUDENT SESSION</p>
          <h2 className="text-lg font-black font-display text-neoBlack">
            HELLO, {userName.split(' ')[0].toUpperCase()}
          </h2>
        </div>
        <div className="w-10 h-10 bg-neoBlack text-neoPrimary font-black text-base flex items-center justify-center border-2 border-neoBlack">
          {userName.charAt(0)}
        </div>
      </div>

      {/* Section Label */}
      <div className="border-b-2.5 border-neoBlack pb-1 flex justify-between items-end">
        <h3 className="text-sm font-black font-display uppercase tracking-wider text-neoBlack">
          TODAY'S CANTEENS
        </h3>
        <span className="text-[11px] font-bold text-slate-600">{canteens.length} AVAILABLE</span>
      </div>

      {error && (
        <div className="p-4 bg-neoDanger text-white border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] text-xs font-black flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canteens.length === 0 && !error && (
        <NeoCard className="text-center py-12">
          <Store className="w-12 h-12 text-slate-400 mx-auto mb-2" />
          <h4 className="text-base font-black font-display text-neoBlack uppercase">NO CANTEENS AVAILABLE</h4>
          <p className="text-xs font-bold text-slate-600 mt-1">Please check back during campus break hours.</p>
        </NeoCard>
      )}

      {/* Canteen Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {canteens.map((canteen) => {
          const isPaused = canteen.status === 'PAUSED';
          return (
            <NeoCard key={canteen.id} className="space-y-4">
              <div className="flex items-start justify-between border-b-2 border-neoBlack pb-3">
                <div>
                  <h3 className="text-xl font-black font-display uppercase text-neoBlack">{canteen.name}</h3>
                  <p className="text-xs font-bold text-slate-600">{canteen.location}</p>
                </div>
                <NeoBadge variant={isPaused ? 'paused' : 'live'}>
                  {isPaused ? 'PAUSED' : 'OPEN'}
                </NeoBadge>
              </div>

              {/* Operational Capacity Meter */}
              <div className="space-y-1 bg-amber-50 p-3 border-2 border-neoBlack">
                <div className="flex justify-between text-xs font-black">
                  <span>PICKUP CAPACITY:</span>
                  <span className={canteen.loadPercentage > 70 ? 'text-neoDanger font-extrabold' : 'text-neoBlack'}>
                    {canteen.loadPercentage}% BUSY
                  </span>
                </div>
                <div className="w-full bg-white h-3.5 border-2 border-neoBlack overflow-hidden">
                  <div
                    className={`h-full ${
                      canteen.loadPercentage > 70 ? 'bg-neoDanger' : 'bg-neoPrimary'
                    }`}
                    style={{ width: `${canteen.loadPercentage}%` }}
                  ></div>
                </div>
                <div className="text-[11px] font-bold text-slate-700 pt-0.5">
                  {canteen.availableItemCount} items ready for pre-order
                </div>
              </div>

              <NeoButton
                onClick={() => router.push(`/student/canteen/${canteen.id}`)}
                variant={isPaused ? 'outline' : 'primary'}
                className="w-full justify-between"
              >
                <span>{isPaused ? 'VIEW MENU (PAUSED)' : 'VIEW MENU'}</span>
                <ChevronRight className="w-5 h-5" />
              </NeoButton>
            </NeoCard>
          );
        })}
      </div>

      <StudentNav />
    </div>
  );
}
