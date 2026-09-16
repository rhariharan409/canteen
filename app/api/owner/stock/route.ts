import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getServiceSupabase();
    let canteenQuery = supabase.from('canteens').select('id');
    if (auth.user.role !== 'ADMIN') {
      canteenQuery = canteenQuery.eq('owner_id', auth.user.id);
    }

    const { data: canteens } = await canteenQuery;
    const canteen = canteens && canteens.length > 0 ? canteens[0] : null;

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned in Supabase.' }, { status: 404 });
    }

    const { data: items, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('canteen_id', canteen.id)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Supabase stock list error: ${error.message}`);
    }

    const formatted = (items || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      price: parseFloat(i.price),
      stockMode: i.stock_type || 'COUNT',
      currentStock: i.current_stock,
      active: i.is_available,
    }));

    return NextResponse.json({ items: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch stock list from Supabase.' }, { status: 500 });
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

    const supabase = getServiceSupabase();
    const { data: item, error: fetchErr } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Menu item not found in Supabase.' }, { status: 404 });
    }

    const prevStock = item.current_stock;
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

    const { data: updated, error: updateErr } = await supabase
      .from('menu_items')
      .update({ current_stock: targetStock })
      .eq('id', itemId)
      .select()
      .single();

    if (updateErr) {
      throw new Error(`Supabase update stock error: ${updateErr.message}`);
    }

    if (changeAmount !== 0) {
      await supabase.from('stock_transactions').insert({
        id: crypto.randomUUID(),
        menu_item_id: itemId,
        quantity_change: changeAmount,
        reason: `Owner manual stock adjustment (${changeAmount > 0 ? '+' : ''}${changeAmount})`,
      });
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        currentStock: updated.current_stock,
        status: updated.current_stock > 0 ? 'Available' : 'Sold Out',
      },
    });
  } catch (error: any) {
    console.error('Stock Update Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update stock in Supabase.' }, { status: 500 });
  }
}

