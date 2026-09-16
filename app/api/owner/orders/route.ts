import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const canteen = await db.canteen.findFirst({
      where: auth.user.role === 'ADMIN' ? {} : { ownerId: auth.user.id },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned.' }, { status: 404 });
    }

    const batches = await db.pickupBatch.findMany({
      where: { canteenId: canteen.id },
      include: {
        orders: {
          include: {
            items: true,
            student: { select: { name: true, phone: true } },
            otpCredential: { select: { otpCode: true, isUsed: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const formattedBatches = batches.map((b) => {
      const formatTime = (d: Date) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      const windowLabel = `${formatTime(b.startTime)} – ${formatTime(b.endTime)}`;

      const totalOrders = b.orders.length;
      const readyCount = b.orders.filter((o) => o.orderStatus === 'READY').length;
      const prepCount = b.orders.filter((o) => ['CONFIRMED', 'PREPARING'].includes(o.orderStatus)).length;
      const collectedCount = b.orders.filter((o) => o.orderStatus === 'COLLECTED').length;

      // Preparation summary for this batch
      const prepSummary: Record<string, number> = {};
      b.orders.forEach((o) => {
        if (['CONFIRMED', 'PREPARING'].includes(o.orderStatus)) {
          o.items.forEach((item) => {
            prepSummary[item.itemName] = (prepSummary[item.itemName] || 0) + item.quantity;
          });
        }
      });

      return {
        id: b.id,
        windowLabel,
        totalOrders,
        readyCount,
        prepCount,
        collectedCount,
        prepSummary,
        orders: b.orders.map((o) => ({
          id: o.id,
          publicOrderCode: o.publicOrderCode,
          studentName: o.student.name,
          studentPhone: o.student.phone,
          orderStatus: o.orderStatus,
          subtotal: o.subtotal,
          pickupWindow: o.pickupWindow,
          otpCode: o.otpCredential?.otpCode,
          isOtpUsed: o.otpCredential?.isUsed || false,
          items: o.items.map((i) => ({
            name: i.itemName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          confirmedAt: o.confirmedAt,
        })),
      };
    });

    return NextResponse.json({ batches: formattedBatches });
  } catch (error: any) {
    console.error('Owner Orders fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { orderId, newStatus, batchId, markBatchReady } = await req.json();

    if (markBatchReady && batchId) {
      // Batch-level preparation action: Mark all CONFIRMED / PREPARING orders in batch as READY
      await db.order.updateMany({
        where: {
          batchId,
          orderStatus: { in: ['CONFIRMED', 'PREPARING'] },
        },
        data: {
          orderStatus: 'READY',
          readyAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: 'All orders in batch marked as READY!' });
    }

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'Order ID and new status are required.' }, { status: 400 });
    }

    // State machine check
    const validTransitions: Record<string, string[]> = {
      CONFIRMED: ['PREPARING', 'READY', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['COLLECTED', 'EXPIRED'],
    };

    const currentOrder = await db.order.findUnique({ where: { id: orderId } });
    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const allowed = validTransitions[currentOrder.orderStatus] || [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition from ${currentOrder.orderStatus} to ${newStatus}.` },
        { status: 400 }
      );
    }

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        orderStatus: newStatus,
        ...(newStatus === 'READY' ? { readyAt: new Date() } : {}),
      },
    });

    // Notify student
    await db.notification.create({
      data: {
        userId: currentOrder.studentId,
        title: newStatus === 'READY' ? 'Order Ready for Pickup!' : `Order Status: ${newStatus}`,
        message:
          newStatus === 'READY'
            ? `Your order ${currentOrder.publicOrderCode} is ready! Please proceed to canteen counter.`
            : `Order ${currentOrder.publicOrderCode} is now ${newStatus.toLowerCase()}.`,
        type: `ORDER_${newStatus}`,
      },
    });

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update order status.' }, { status: 500 });
  }
}
