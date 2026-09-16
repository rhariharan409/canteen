import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const owners = await db.user.findMany({
      where: { role: 'OWNER' },
      include: {
        canteens: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pendingOwners = owners.filter((o) => o.status === 'PENDING');
    const activeOwners = owners.filter((o) => o.status === 'ACTIVE');
    const suspendedOwners = owners.filter((o) => o.status === 'SUSPENDED');

    return NextResponse.json({
      pending: pendingOwners,
      active: activeOwners,
      suspended: suspendedOwners,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch owner accounts.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { ownerId, action, canteenId } = await req.json();

    if (!ownerId || !action) {
      return NextResponse.json({ error: 'Owner ID and action are required.' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const updated = await db.user.update({
        where: { id: ownerId },
        data: { status: 'ACTIVE' },
      });

      if (canteenId) {
        await db.canteen.update({
          where: { id: canteenId },
          data: { ownerId: ownerId },
        });
      }

      return NextResponse.json({ success: true, message: 'Owner approved successfully!', user: updated });
    } else if (action === 'REJECT' || action === 'SUSPEND') {
      const updated = await db.user.update({
        where: { id: ownerId },
        data: { status: 'SUSPENDED' },
      });

      // Remove assignment if suspended
      await db.canteen.updateMany({
        where: { ownerId },
        data: { ownerId: null },
      });

      return NextResponse.json({ success: true, message: 'Owner account suspended.', user: updated });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Owner approval action error:', error);
    return NextResponse.json({ error: 'Failed to process owner request.' }, { status: 500 });
  }
}
