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
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch menu.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, category, price, description, stockMode, initialStock } = await req.json();

    if (!name || !price) {
      return NextResponse.json({ error: 'Item name and price are required.' }, { status: 400 });
    }

    const canteen = await db.canteen.findFirst({
      where: auth.user.role === 'ADMIN' ? {} : { ownerId: auth.user.id },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned.' }, { status: 404 });
    }

    const stock = initialStock ? parseInt(initialStock) : 0;

    const newItem = await db.menuItem.create({
      data: {
        canteenId: canteen.id,
        name: name.trim(),
        category: category ? category.trim() : 'General',
        price: parseFloat(price),
        description: description ? description.trim() : null,
        stockMode: stockMode === 'CAPACITY' ? 'CAPACITY' : 'COUNT',
        currentStock: Math.max(0, stock),
        active: true,
      },
    });

    if (stock > 0) {
      await db.stockTransaction.create({
        data: {
          menuItemId: newItem.id,
          changeAmount: stock,
          previousStock: 0,
          newStock: stock,
          transactionType: 'INITIAL',
          note: 'Initial stock creation',
        },
      });
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error('Create item error:', error);
    return NextResponse.json({ error: 'Failed to create menu item.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, name, category, price, active, description, stockMode } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required.' }, { status: 400 });
    }

    const updated = await db.menuItem.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(category ? { category: category.trim() } : {}),
        ...(price !== undefined ? { price: parseFloat(price) } : {}),
        ...(active !== undefined ? { active: Boolean(active) } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(stockMode ? { stockMode } : {}),
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update menu item.' }, { status: 500 });
  }
}
