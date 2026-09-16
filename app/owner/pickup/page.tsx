'use client';

import { useState, useRef } from 'react';
import OwnerNav from '@/components/OwnerNav';
import { QrCode, CheckCircle2, AlertCircle, RefreshCw, UserCheck } from 'lucide-react';

interface VerifiedOrder {
  id: string;
  publicOrderCode: string;
  studentName: string;
  studentPhone?: string;
  orderStatus: string;
  subtotal: number;
  pickupWindow: string;
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export default function OwnerPickupVerificationPage() {
  const [orderCode, setOrderCode] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [verifiedOrder, setVerifiedOrder] = useState<VerifiedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const codeInputRef = useRef<HTMLInputElement>(null);

  const handleVerifyPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/owner/pickup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicOrderCode: orderCode,
          otpCode,
          action: 'PREVIEW',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Verification failed.');
        setVerifiedOrder(null);
      } else {
        setVerifiedOrder(data.order);
      }
    } catch (err) {
      setError('Connection error.');
    }
    setLoading(false);
  };

  const handleCompletePickup = async () => {
    if (!orderCode || !otpCode) return;
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/owner/pickup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicOrderCode: orderCode,
          otpCode,
          action: 'COMPLETE',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to complete pickup.');
      } else {
        setSuccessMsg(data.message || `Pickup completed for Order ${orderCode}!`);
        setVerifiedOrder(null);
        setOrderCode('');
        setOtpCode('');
        if (codeInputRef.current) codeInputRef.current.focus();
      }
    } catch (err) {
      setError('Connection error.');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setOrderCode('');
    setOtpCode('');
    setVerifiedOrder(null);
    setError('');
    setSuccessMsg('');
    if (codeInputRef.current) codeInputRef.current.focus();
  };

  return (
    <div className="space-y-6 pb-20 md:pt-16 max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm text-center">
        <div className="w-12 h-12 bg-sky-500 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-2 font-extrabold shadow-sm">
          <QrCode className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight">PICKUP VERIFICATION</h1>
        <p className="text-xs text-slate-400 mt-0.5">Fast counter OTP & Order ID verification</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Verification Input Form */}
      {!verifiedOrder ? (
        <form onSubmit={handleVerifyPreview} className="surface-card p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 bg-white">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              Order ID (e.g. A247)
            </label>
            <input
              ref={codeInputRef}
              type="text"
              required
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              placeholder="A247"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-xl font-black uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase mb-1">
              4-Digit Pickup OTP (e.g. 5832)
            </label>
            <input
              type="text"
              maxLength={4}
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="5832"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-2xl font-mono font-extrabold tracking-widest text-center text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !orderCode || !otpCode}
            className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'VERIFY PICKUP'}
          </button>
        </form>
      ) : (
        /* Verified Order Preview Slip */
        <div className="surface-card p-6 rounded-2xl border border-emerald-300 bg-emerald-50/50 shadow-md space-y-5">
          <div className="flex items-center gap-3 border-b border-emerald-200 pb-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">PICKUP VERIFIED</span>
              <h2 className="text-2xl font-black text-slate-900">ORDER {verifiedOrder.publicOrderCode}</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-emerald-200">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Student: {verifiedOrder.studentName}</span>
          </div>

          <div className="space-y-1.5 bg-white p-4 rounded-xl border border-emerald-200">
            <div className="text-xs font-bold text-slate-500 uppercase mb-1">Pre-Packed Order Items</div>
            {verifiedOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm font-extrabold text-slate-900">
                <span>{item.itemName}</span>
                <span className="text-sky-700">× {item.quantity}</span>
              </div>
            ))}
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Amount</span>
              <span>₹{verifiedOrder.subtotal}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={resetForm}
              className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleCompletePickup}
              disabled={loading}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'COMPLETE PICKUP'}
            </button>
          </div>
        </div>
      )}

      <OwnerNav />
    </div>
  );
}
