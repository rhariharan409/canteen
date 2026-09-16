import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getServiceSupabase();
    let canteenQuery = supabase.from('canteens').select('id, name');
    if (auth.user.role !== 'ADMIN') {
      canteenQuery = canteenQuery.eq('owner_id', auth.user.id);
    }

    const { data: canteens } = await canteenQuery;
    const canteen = canteens && canteens.length > 0 ? canteens[0] : null;

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned in Supabase.' }, { status: 404 });
    }

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_code,
        status,
        subtotal,
        pickup_window,
        confirmed_at,
        profiles ( full_name, phone ),
        order_items ( id, item_name, quantity, unit_price ),
        otp_credentials ( otp_code, is_used )
      `)
      .eq('canteen_id', canteen.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Supabase orders query error: ${error.message}`);
    }

    const formattedOrders = (orders || []).map((o: any) => {
      const otpCred = Array.isArray(o.otp_credentials) ? o.otp_credentials[0] : o.otp_credentials;
      return {
        id: o.id,
        publicOrderCode: o.order_code,
        studentName: (o.profiles as any)?.full_name || 'Student',
        studentPhone: (o.profiles as any)?.phone || 'N/A',
        orderStatus: o.status,
        subtotal: parseFloat(o.subtotal),
        pickupWindow: o.pickup_window,
        otpCode: otpCred?.otp_code || otpCred?.otpCode || null,
        isOtpUsed: otpCred?.is_used || false,
        items: (o.order_items || []).map((i: any) => ({
          name: i.item_name,
          quantity: i.quantity,
          unitPrice: parseFloat(i.unit_price),
        })),
        confirmedAt: o.confirmed_at,
      };
    });

    const prepSummary: Record<string, number> = {};
    formattedOrders.forEach((o: any) => {
      if (['CONFIRMED', 'PREPARING'].includes(o.orderStatus)) {
        o.items.forEach((item: any) => {
          prepSummary[item.name] = (prepSummary[item.name] || 0) + item.quantity;
        });
      }
    });

    const singleBatch = {
      id: 'batch_active',
      windowLabel: '10:35 – 10:40',
      totalOrders: formattedOrders.length,
      readyCount: formattedOrders.filter((o: any) => o.orderStatus === 'READY').length,
      prepCount: formattedOrders.filter((o: any) => ['CONFIRMED', 'PREPARING'].includes(o.orderStatus)).length,
      collectedCount: formattedOrders.filter((o: any) => o.orderStatus === 'COLLECTED').length,
      prepSummary,
      orders: formattedOrders,
    };

    return NextResponse.json({ batches: [singleBatch] });
  } catch (error: any) {
    console.error('Owner Orders fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch orders from Supabase.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { orderId, newStatus, markBatchReady } = await req.json();
    const supabase = getServiceSupabase();

    if (markBatchReady) {
      await supabase
        .from('orders')
        .update({
          status: 'READY',
          ready_at: new Date().toISOString(),
        })
        .in('status', ['CONFIRMED', 'PREPARING']);

      return NextResponse.json({ success: true, message: 'All active orders marked as READY in Supabase!' });
    }

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Order ID and new status are required.' }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        ...(newStatus === 'READY' ? { ready_at: new Date().toISOString() } : {}),
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase update order error: ${error.message}`);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update order status in Supabase.' }, { status: 500 });
  }
}

