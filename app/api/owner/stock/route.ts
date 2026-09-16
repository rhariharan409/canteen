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

    const items = await db.menuItem.findMany({
      where: { canteenId: canteen.id },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stockMode: true,
        currentStock: true,
        dailyCapacity: true,
        active: true,
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch stock list.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { itemId, newStock, delta } = await req.json();

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const item = await db.menuItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'Menu item not found.' }, { status: 404 });
    }

    const prevStock = item.currentStock;
    let targetStock = prevStock;

    if (newStock !== undefined) {
      targetStock = parseInt(newStock);
    } else if (delta !== undefined) {
      targetStock = prevStock + parseInt(delta);
    }

    if (isNaN(targetStock) || targetStock < 0) {
      return NextResponse.json({ error: 'Stock quantity cannot be negative.' }, { status: 400 });
    }

    const changeAmount = targetStock - prevStock;

    const updated = await db.menuItem.update({
      where: { id: itemId },
      data: { currentStock: targetStock },
    });

    if (changeAmount !== 0) {
      await db.stockTransaction.create({
        data: {
          menuItemId: itemId,
          changeAmount,
          previousStock: prevStock,
          newStock: targetStock,
          transactionType: 'MANUAL_ADJUSTMENT',
          note: `Owner manual stock adjustment (${changeAmount > 0 ? '+' : ''}${changeAmount})`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        currentStock: updated.currentStock,
        status: updated.currentStock > 0 ? 'Available' : 'Sold Out',
      },
    });
  } catch (error: any) {
    console.error('Stock Update Error:', error);
    return NextResponse.json({ error: 'Failed to update stock.' }, { status: 500 });
  }
}
