import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const canteens = await db.canteen.findMany({
      where: {
        status: { in: ['LIVE', 'PAUSED'] },
      },
      include: {
        capacitySettings: true,
        menuItems: {
          where: { active: true },
          select: { id: true, currentStock: true },
        },
        orders: {
          where: {
            orderStatus: { in: ['PAID', 'CONFIRMED', 'PREPARING'] },
          },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formatted = canteens.map((canteen) => {
      const activeItemsCount = canteen.menuItems.filter((i) => i.currentStock > 0).length;
      const activeOrderCount = canteen.orders.length;
      const maxActive = canteen.capacitySettings?.maxActiveOrders || 100;
      const loadPercentage = Math.round((activeOrderCount / maxActive) * 100);

      let pickupLoadLabel = 'Low';
      if (loadPercentage > 75) pickupLoadLabel = 'High';
      else if (loadPercentage > 40) pickupLoadLabel = 'Medium';

      let displayStatus = canteen.status;
      if (canteen.capacitySettings?.isPaused) {
        displayStatus = 'PAUSED';
      }

      return {
        id: canteen.id,
        name: canteen.name,
        location: canteen.location,
        status: displayStatus,
        availableItemCount: activeItemsCount,
        totalItemCount: canteen.menuItems.length,
        estimatedPickupLoad: pickupLoadLabel,
        loadPercentage,
      };
    });

    return NextResponse.json({ canteens: formatted });
  } catch (error: any) {
    console.error('Error fetching canteens:', error);
    return NextResponse.json({ error: 'Failed to retrieve canteens.' }, { status: 500 });
  }
}
