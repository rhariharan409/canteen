import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const canteen = await db.canteen.findUnique({
      where: { id: params.id },
      include: {
        capacitySettings: true,
        menuItems: {
          where: { active: true },
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'Canteen not found.' }, { status: 404 });
    }

    const categories = Array.from(new Set(canteen.menuItems.map((item) => item.category)));

    return NextResponse.json({
      canteen: {
        id: canteen.id,
        name: canteen.name,
        location: canteen.location,
        status: canteen.capacitySettings?.isPaused ? 'PAUSED' : canteen.status,
        isPaused: canteen.capacitySettings?.isPaused || false,
      },
      categories: ['All', ...categories],
      menuItems: canteen.menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        description: item.description,
        price: item.price,
        currentStock: item.currentStock,
        stockMode: item.stockMode,
        isAvailable: item.currentStock > 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching canteen details:', error);
    return NextResponse.json({ error: 'Failed to retrieve menu.' }, { status: 500 });
  }
}
