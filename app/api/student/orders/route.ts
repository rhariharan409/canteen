import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseCheckoutOrder } from '@/lib/supabase-service';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['STUDENT']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: auth.status });
  }

  try {
    const { canteenId, cartItems } = await req.json();

    if (!canteenId || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: 'Invalid order payload.' }, { status: 400 });
    }

    const order = await supabaseCheckoutOrder(auth.user.id, canteenId, cartItems);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        publicOrderCode: order.publicOrderCode,
        canteenName: order.canteenName,
        pickupWindow: order.pickupWindow,
        otpCode: order.otpCode,
        subtotal: order.subtotal,
        orderStatus: order.orderStatus,
        items: order.items,
        confirmedAt: order.confirmedAt,
      },
    });
  } catch (error: any) {
    console.error('Order Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to place order.' }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['STUDENT']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        status,
        subtotal,
        pickup_window,
        confirmed_at,
        collected_at,
        canteens ( name, location ),
        order_items ( id, item_name, quantity, unit_price, total_price ),
        otp_credentials ( otp_code, is_used )
      `)
      .eq('student_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Supabase orders query error: ${error.message}`);
    }

    const formattedOrders = (orders || []).map((o: any) => {
      const canteen = Array.isArray(o.canteens) ? o.canteens[0] : o.canteens;
      const otpCred = Array.isArray(o.otp_credentials) ? o.otp_credentials[0] : o.otp_credentials;

      return {
        id: o.id,
        publicOrderCode: o.order_code,
        canteenName: canteen?.name || 'Canteen',
        canteenLocation: canteen?.location || 'Campus Canteen',
        pickupWindow: o.pickup_window,
        otpCode: otpCred?.otpCode || otpCred?.otp_code || null,
        orderStatus: o.status,
        subtotal: parseFloat(o.subtotal),
        items: o.order_items || [],
        confirmedAt: o.confirmed_at,
        collectedAt: o.collected_at,
      };
    });

    const activeOrder = formattedOrders.find((o: any) =>
      ['CONFIRMED', 'PREPARING', 'READY', 'PAID'].includes(o.orderStatus)
    );

    return NextResponse.json({
      activeOrder: activeOrder || null,
      history: formattedOrders,
    });
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch order history from Supabase.' }, { status: 500 });
  }
}

