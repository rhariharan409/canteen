'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Lock, Mail, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

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
    // Check if session exists and redirect automatically
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
        <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-sm text-slate-500 font-medium">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center max-w-md mx-auto py-6">
      {/* App Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-sky-600 text-white rounded-2xl shadow-sm mb-3">
          <Utensils className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">CAMPUS CANTEEN</h1>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-600 mt-0.5">
          Smart Pre-Order & Pickup System
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full surface-card p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-200 mb-6">
          <button
            onClick={() => {
              setIsSignup(false);
              setError('');
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-colors ${
              !isSignup ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setIsSignup(true);
              setError('');
            }}
            className={`flex-1 py-2.5 text-center text-sm font-semibold border-b-2 transition-colors ${
              isSignup ? 'border-sky-600 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
            {message}
          </div>
        )}

        {!isSignup ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {submitting ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hariharan R"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@campus.edu"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mobile Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwnerRequest}
                  onChange={(e) => setIsOwnerRequest(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span className="text-xs text-slate-700 font-medium">Request Canteen Owner Account</span>
              </label>
              {isOwnerRequest && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg mt-1.5 border border-amber-200">
                  ⚠️ Owner accounts require explicit approval by Campus Admin before canteen access is granted.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-sm text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {submitting ? 'Registering...' : 'Create Account'}
            </button>
          </form>
        )}
      </div>

      {/* Quick Demo Selector */}
      <div className="w-full mt-6 surface-card p-4 rounded-xl border border-slate-200">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 text-center">
          ⚡ One-Click Demo Access
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => fillQuickDemo('student@campus.edu', 'password123')}
            className="px-2 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold text-sky-800 transition-colors flex flex-col items-center gap-1"
          >
            <UserCheck className="w-4 h-4 text-sky-600" />
            <span>Student</span>
          </button>
          <button
            onClick={() => fillQuickDemo('ravi@maincanteen.edu', 'password123')}
            className="px-2 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 transition-colors flex flex-col items-center gap-1"
          >
            <Utensils className="w-4 h-4 text-emerald-600" />
            <span>Owner</span>
          </button>
          <button
            onClick={() => fillQuickDemo('admin@campus.edu', 'password123')}
            className="px-2 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold text-purple-800 transition-colors flex flex-col items-center gap-1"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
