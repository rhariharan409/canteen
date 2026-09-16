import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseVerifyOtp } from '@/lib/supabase-service';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { publicOrderCode, otpCode, action } = await req.json();

    if (!publicOrderCode) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    let canteenQuery = supabase.from('canteens').select('id, name');
    if (auth.user.role !== 'ADMIN') {
      canteenQuery = canteenQuery.eq('owner_id', auth.user.id);
    }

    const { data: canteens } = await canteenQuery;
    const canteen = canteens && canteens.length > 0 ? canteens[0] : null;

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned to your account in Supabase.' }, { status: 404 });
    }

    // Step 1: Preview / Lookup Order before final completion
    if (action === 'PREVIEW') {
      const cleanCode = publicOrderCode.trim().toUpperCase();
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_code,
          status,
          subtotal,
          pickup_window,
          profiles ( full_name, phone ),
          order_items ( id, item_name, quantity, unit_price, total_price ),
          otp_credentials ( otp_code, is_used, attempts )
        `)
        .eq('canteen_id', canteen.id)
        .eq('order_code', cleanCode)
        .single();

      if (error || !order) {
        return NextResponse.json({ error: `Order ID "${cleanCode}" not found for this canteen in Supabase.` }, { status: 404 });
      }

      if (order.status === 'COLLECTED') {
        return NextResponse.json({ error: `Order ${cleanCode} has already been collected.` }, { status: 400 });
      }

      const otpCred = Array.isArray(order.otp_credentials) ? order.otp_credentials[0] : order.otp_credentials;

      if (otpCode && otpCred && otpCred.otp_code !== otpCode.trim()) {
        await supabase
          .from('otp_credentials')
          .update({ attempts: (otpCred.attempts || 0) + 1 })
          .eq('order_id', order.id);

        return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          publicOrderCode: order.order_code,
          studentName: (order.profiles as any)?.full_name || 'Student',
          studentPhone: (order.profiles as any)?.phone || 'N/A',
          orderStatus: order.status,
          subtotal: order.subtotal,
          pickupWindow: order.pickup_window,
          otpCode: otpCred?.otp_code,
          items: order.order_items || [],
        },
      });
    }

    // Step 2: Finalize Pickup Verification & Mark COLLECTED in Supabase
    if (!otpCode) {
      return NextResponse.json({ error: 'OTP is required to complete pickup.' }, { status: 400 });
    }

    const completedOrder = await supabaseVerifyOtp(canteen.id, publicOrderCode, otpCode);

    return NextResponse.json({
      success: true,
      message: `Pickup verified successfully for Order ${completedOrder.publicOrderCode}!`,
      order: {
        id: completedOrder.id,
        publicOrderCode: completedOrder.publicOrderCode,
        studentName: completedOrder.studentName,
        orderStatus: completedOrder.orderStatus,
        collectedAt: completedOrder.collectedAt,
        items: completedOrder.items,
      },
    });
  } catch (error: any) {
    console.error('OTP Verification Error:', error);
    return NextResponse.json({ error: error.message || 'OTP Verification failed on Supabase.' }, { status: 400 });
  }
}

