import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const totalUsers = await db.user.count();
    const totalStudents = await db.user.count({ where: { role: 'STUDENT' } });
    const totalOwners = await db.user.count({ where: { role: 'OWNER', status: 'ACTIVE' } });
    const totalCanteens = await db.canteen.count();

    const allOrders = await db.order.findMany({
      include: {
        canteen: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrdersCount = allOrders.length;
    const totalRevenue = allOrders.reduce((acc, o) => acc + o.subtotal, 0);

    const ordersByCanteen: Record<string, { count: number; revenue: number }> = {};
    const popularItems: Record<string, number> = {};

    allOrders.forEach((o) => {
      const cName = o.canteen.name;
      if (!ordersByCanteen[cName]) {
        ordersByCanteen[cName] = { count: 0, revenue: 0 };
      }
      ordersByCanteen[cName].count += 1;
      ordersByCanteen[cName].revenue += o.subtotal;

      o.items.forEach((item) => {
        popularItems[item.itemName] = (popularItems[item.itemName] || 0) + item.quantity;
      });
    });

    return NextResponse.json({
      summary: {
        totalUsers,
        totalStudents,
        totalOwners,
        totalCanteens,
        totalOrders: totalOrdersCount,
        totalRevenue: Math.round(totalRevenue),
      },
      ordersByCanteen,
      popularItems,
      recentOrders: allOrders.slice(0, 10).map((o) => ({
        id: o.id,
        code: o.publicOrderCode,
        canteen: o.canteen.name,
        amount: o.subtotal,
        status: o.orderStatus,
        createdAt: o.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Failed to generate admin reports.' }, { status: 500 });
  }
}
