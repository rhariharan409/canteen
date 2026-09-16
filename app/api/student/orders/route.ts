import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { executeAtomicOrderCheckout } from '@/lib/canteen-service';

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

    const order = await executeAtomicOrderCheckout(auth.user.id, canteenId, cartItems);

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        publicOrderCode: order.publicOrderCode,
        canteenName: order.canteen.name,
        pickupWindow: order.pickupWindow,
        otpCode: order.otpCredential?.otpCode,
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
    const orders = await db.order.findMany({
      where: { studentId: auth.user.id },
      include: {
        canteen: { select: { name: true, location: true } },
        items: true,
        otpCredential: { select: { otpCode: true, isUsed: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const activeOrder = orders.find((o) =>
      ['CONFIRMED', 'PREPARING', 'READY', 'PAID'].includes(o.orderStatus)
    );

    return NextResponse.json({
      activeOrder: activeOrder
        ? {
            id: activeOrder.id,
            publicOrderCode: activeOrder.publicOrderCode,
            canteenName: activeOrder.canteen.name,
            canteenLocation: activeOrder.canteen.location,
            pickupWindow: activeOrder.pickupWindow,
            otpCode: activeOrder.otpCredential?.otpCode || null,
            orderStatus: activeOrder.orderStatus,
            subtotal: activeOrder.subtotal,
            items: activeOrder.items,
            confirmedAt: activeOrder.confirmedAt,
          }
        : null,
      history: orders.map((o) => ({
        id: o.id,
        publicOrderCode: o.publicOrderCode,
        canteenName: o.canteen.name,
        pickupWindow: o.pickupWindow,
        subtotal: o.subtotal,
        orderStatus: o.orderStatus,
        itemsCount: o.items.reduce((acc, item) => acc + item.quantity, 0),
        confirmedAt: o.confirmedAt,
        collectedAt: o.collectedAt,
      })),
    });
  } catch (error: any) {
    console.error('Fetch Orders Error:', error);
    return NextResponse.json({ error: 'Failed to fetch order history.' }, { status: 500 });
  }
}
