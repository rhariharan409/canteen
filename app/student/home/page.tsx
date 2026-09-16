'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentNav from '@/components/StudentNav';
import { Store, ChevronRight, AlertCircle } from 'lucide-react';

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
    // Load session user and active canteens
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
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Loading campus canteens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Campus Pre-Order</p>
          <h1 className="text-xl font-extrabold text-slate-900 mt-0.5">
            Good morning, {userName.split(' ')[0]}
          </h1>
        </div>
        <div className="w-10 h-10 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-extrabold text-sm border border-sky-200">
          {userName.charAt(0)}
        </div>
      </div>

      {/* Section Title */}
      <div>
        <h2 className="text-base font-bold text-slate-900 mb-1">Choose a Canteen</h2>
        <p className="text-xs text-slate-500">Select your canteen to browse live available stock.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {canteens.length === 0 && !error && (
        <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center space-y-2">
          <Store className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No canteens are currently available.</p>
          <p className="text-xs text-slate-500">Please check back later during canteen operating hours.</p>
        </div>
      )}

      {/* Canteen Cards List */}
      <div className="grid gap-4 md:grid-cols-2">
        {canteens.map((canteen) => {
          const isPaused = canteen.status === 'PAUSED';
          return (
            <div
              key={canteen.id}
              className={`surface-card p-5 rounded-2xl border transition-all hover:border-slate-300 ${
                isPaused ? 'opacity-85 bg-slate-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{canteen.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">{canteen.location}</p>
                </div>
                <span className={`status-badge ${isPaused ? 'status-paused' : 'status-live'}`}>
                  {isPaused ? 'PAUSED' : 'OPEN'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 font-normal">Available:</span>{' '}
                  <span className="text-slate-900 font-bold">{canteen.availableItemCount} items</span>
                </div>
                <div>
                  <span className="text-slate-400 font-normal">Pickup Load:</span>{' '}
                  <span
                    className={`font-bold ${
                      canteen.estimatedPickupLoad === 'High'
                        ? 'text-amber-700'
                        : canteen.estimatedPickupLoad === 'Medium'
                        ? 'text-sky-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {canteen.estimatedPickupLoad}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/student/canteen/${canteen.id}`)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isPaused
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                }`}
              >
                <span>{isPaused ? 'View Menu (Orders Paused)' : 'View Menu'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      <StudentNav />
    </div>
  );
}
