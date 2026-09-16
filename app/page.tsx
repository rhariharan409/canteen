'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NeoButton } from '@/components/neo/NeoButton';
import { NeoCard } from '@/components/neo/NeoCard';
import { NeoInput } from '@/components/neo/NeoInput';
import { Utensils, Mail, Lock, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';

export default function EntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isOwnerRequest, setIsOwnerRequest] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          if (data.user.role === 'OWNER') router.replace('/owner/dashboard');
          else if (data.user.role === 'ADMIN') router.replace('/admin/dashboard');
          else router.replace('/student/home');
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        setSubmitting(false);
        return;
      }

      router.replace(data.redirectUrl);
    } catch (err) {
      setError('Connection error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          requestedRole: isOwnerRequest ? 'OWNER' : 'STUDENT',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        setSubmitting(false);
        return;
      }

      if (data.message) {
        setMessage(data.message);
        setIsSignup(false);
        setSubmitting(false);
        return;
      }

      router.replace(data.redirectUrl || '/student/home');
    } catch (err) {
      setError('Connection error. Please try again.');
      setSubmitting(false);
    }
  };

  const fillQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setIsSignup(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-neoBlack border-t-neoPrimary rounded-none animate-spin"></div>
        <p className="mt-3 text-xs font-black uppercase text-neoBlack tracking-wider">INITIALIZING iCAMPUS SESSION...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center max-w-md mx-auto py-6">
      {/* Product Hero Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-neoPrimary border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] mb-3">
          <Utensils className="w-8 h-8 text-neoBlack" />
        </div>
        <h1 className="text-3xl font-black font-display text-neoBlack uppercase tracking-tight">
          iCAMPUS CANTEEN
        </h1>
        <div className="inline-block bg-neoBlack text-neoPrimary px-3 py-0.5 text-xs font-black uppercase tracking-widest mt-1 border border-neoBlack">
          ORDER BEFORE THE RUSH
        </div>
      </div>

      {/* Main Neo Card */}
      <NeoCard className="w-full">
        <div className="flex border-b-2 border-neoBlack mb-6">
          <button
            onClick={() => {
              setIsSignup(false);
              setError('');
            }}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-colors ${
              !isSignup ? 'bg-neoPrimary text-neoBlack font-display border-r-2 border-neoBlack' : 'bg-white text-slate-500 hover:text-neoBlack border-r-2 border-neoBlack'
            }`}
          >
            LOG IN
          </button>
          <button
            onClick={() => {
              setIsSignup(true);
              setError('');
            }}
            className={`flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-colors ${
              isSignup ? 'bg-neoPrimary text-neoBlack font-display' : 'bg-white text-slate-500 hover:text-neoBlack'
            }`}
          >
            CREATE ACCOUNT
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-2 border-neoBlack text-xs font-black text-red-900 shadow-[2px_2px_0px_0px_#111111]">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-100 border-2 border-neoBlack text-xs font-black text-emerald-900 shadow-[2px_2px_0px_0px_#111111]">
            {message}
          </div>
        )}

        {!isSignup ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <NeoInput
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@campus.edu"
            />

            <NeoInput
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <NeoButton
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full mt-2"
            >
              {submitting ? 'AUTHENTICATING...' : 'SIGN IN →'}
            </NeoButton>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <NeoInput
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hariharan R"
            />

            <NeoInput
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@campus.edu"
            />

            <NeoInput
              label="Mobile Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
            />

            <NeoInput
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwnerRequest}
                  onChange={(e) => setIsOwnerRequest(e.target.checked)}
                  className="w-4 h-4 border-2 border-neoBlack accent-neoBlack"
                />
                <span className="text-xs text-neoBlack font-bold uppercase">Request Canteen Owner Account</span>
              </label>
            </div>

            <NeoButton
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full mt-2"
            >
              {submitting ? 'REGISTERING...' : 'REGISTER ACCOUNT'}
            </NeoButton>
          </form>
        )}
      </NeoCard>

      {/* Quick Demo Access Bar */}
      <div className="w-full mt-6 surface-card p-4 border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] bg-white">
        <p className="text-[11px] font-black text-neoBlack uppercase tracking-widest mb-2.5 text-center font-display">
          ⚡ DEMO ACCOUNTS ONE-CLICK LOGIN
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => fillQuickDemo('student@campus.edu', 'password123')}
            className="p-2 bg-neoPrimary hover:bg-yellow-300 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111] text-[11px] font-black text-neoBlack flex flex-col items-center gap-1 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <UserCheck className="w-4 h-4" />
            <span>STUDENT</span>
          </button>

          <button
            onClick={() => fillQuickDemo('ravi@maincanteen.edu', 'password123')}
            className="p-2 bg-neoSecondary hover:bg-orange-500 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111] text-[11px] font-black text-white flex flex-col items-center gap-1 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Utensils className="w-4 h-4" />
            <span>OWNER</span>
          </button>

          <button
            onClick={() => fillQuickDemo('admin@campus.edu', 'password123')}
            className="p-2 bg-neoBlack hover:bg-slate-800 border-2 border-neoBlack shadow-[2px_2px_0px_0px_#D9FF00] text-[11px] font-black text-neoPrimary flex flex-col items-center gap-1 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ADMIN</span>
          </button>
        </div>
      </div>
    </div>
  );
}
