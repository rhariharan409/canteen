import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const canteens = await db.canteen.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
        capacitySettings: true,
        _count: { select: { menuItems: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const owners = await db.user.findMany({
      where: { role: 'OWNER', status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
    });

    return NextResponse.json({ canteens, availableOwners: owners });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch canteens.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { name, location, ownerId, status } = await req.json();

    if (!name || !location) {
      return NextResponse.json({ error: 'Canteen name and location are required.' }, { status: 400 });
    }

    const canteen = await db.canteen.create({
      data: {
        name: name.trim(),
        location: location.trim(),
        status: status || 'LIVE',
        ownerId: ownerId || null,
        capacitySettings: {
          create: {
            maxActiveOrders: 100,
            maxPickupOrdersPerBatch: 40,
            prepCapacityPerBatch: 50,
            breakDurationMinutes: 15,
            isPaused: false,
          },
        },
      },
      include: { owner: true },
    });

    return NextResponse.json({ success: true, canteen });
  } catch (error: any) {
    console.error('Create canteen error:', error);
    return NextResponse.json({ error: 'Failed to create canteen.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id, name, location, ownerId, status } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Canteen ID is required.' }, { status: 400 });
    }

    const updated = await db.canteen.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(location ? { location: location.trim() } : {}),
        ...(status ? { status } : {}),
        ownerId: ownerId === 'unassigned' ? null : ownerId,
      },
      include: { owner: true },
    });

    return NextResponse.json({ success: true, canteen: updated });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update canteen.' }, { status: 500 });
  }
}
