import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['STUDENT']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { amount, canteenId } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount.' }, { status: 400 });
    }

    const orderId = `rzp_order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return NextResponse.json({
      success: true,
      razorpayOrderId: orderId,
      amount: Math.round(amount * 100), // in paise
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_campus_canteen_key',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Payment initialization failed.' }, { status: 500 });
  }
}
