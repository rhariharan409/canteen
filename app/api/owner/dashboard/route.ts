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
      include: {
        capacitySettings: true,
      },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned to this owner account.' }, { status: 404 });
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayOrders = await db.order.findMany({
      where: {
        canteenId: canteen.id,
        createdAt: { gte: startOfDay },
      },
      include: {
        items: true,
      },
    });

    const totalOrdersCount = todayOrders.length;
    const readyCount = todayOrders.filter((o) => o.orderStatus === 'READY').length;
    const preparingCount = todayOrders.filter((o) => o.orderStatus === 'PREPARING' || o.orderStatus === 'CONFIRMED').length;
    const collectedCount = todayOrders.filter((o) => o.orderStatus === 'COLLECTED').length;

    const maxActive = canteen.capacitySettings?.maxActiveOrders || 100;
    const activeCount = preparingCount + readyCount;
    const capacityPercentage = Math.min(100, Math.round((activeCount / maxActive) * 100));

    // Get current active pickup batch details
    const activeBatches = await db.pickupBatch.findMany({
      where: {
        canteenId: canteen.id,
      },
      include: {
        orders: {
          include: { items: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const currentBatch = activeBatches.find((b) => b.orders.some((o) => o.orderStatus !== 'COLLECTED')) || activeBatches[0];

    // Compute preparation summary for current batch
    const prepSummary: Record<string, number> = {};
    let currentBatchReadyCount = 0;
    let currentBatchPrepCount = 0;

    if (currentBatch) {
      for (const ord of currentBatch.orders) {
        if (ord.orderStatus === 'READY') currentBatchReadyCount++;
        else if (['CONFIRMED', 'PREPARING'].includes(ord.orderStatus)) currentBatchPrepCount++;

        if (['CONFIRMED', 'PREPARING'].includes(ord.orderStatus)) {
          for (const item of ord.items) {
            prepSummary[item.itemName] = (prepSummary[item.itemName] || 0) + item.quantity;
          }
        }
      }
    }

    return NextResponse.json({
      canteen: {
        id: canteen.id,
        name: canteen.name,
        location: canteen.location,
        status: canteen.status,
        isPaused: canteen.capacitySettings?.isPaused || false,
      },
      metrics: {
        todayOrders: totalOrdersCount,
        ready: readyCount,
        preparing: preparingCount,
        collected: collectedCount,
        capacityPercentage,
      },
      currentBatch: currentBatch
        ? {
            id: currentBatch.id,
            windowLabel: `${currentBatch.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${currentBatch.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            totalOrders: currentBatch.orders.length,
            preparing: currentBatchPrepCount,
            ready: currentBatchReadyCount,
            prepSummary,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Owner Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard metrics.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action } = await req.json();

    const canteen = await db.canteen.findFirst({
      where: auth.user.role === 'ADMIN' ? {} : { ownerId: auth.user.id },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned.' }, { status: 404 });
    }

    if (action === 'PAUSE_ORDERS' || action === 'RESUME_ORDERS') {
      const isPaused = action === 'PAUSE_ORDERS';
      await db.capacitySettings.upsert({
        where: { canteenId: canteen.id },
        update: { isPaused },
        create: { canteenId: canteen.id, isPaused },
      });

      return NextResponse.json({
        success: true,
        message: isPaused ? 'Orders temporarily paused.' : 'Orders resumed.',
        isPaused,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Owner Dashboard Action Error:', error);
    return NextResponse.json({ error: 'Action failed.' }, { status: 500 });
  }
}
