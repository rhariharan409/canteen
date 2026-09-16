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
      throw new Error(`Supabase fetch menu error: ${error.message}`);
    }

    const formatted = (items || []).map((i: any) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      price: parseFloat(i.price),
      description: i.description,
      stockMode: i.stock_type || 'COUNT',
      currentStock: i.current_stock,
      active: i.is_available,
    }));

    return NextResponse.json({ items: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch menu from Supabase.' }, { status: 500 });
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

    const stock = initialStock ? parseInt(initialStock) : 0;
    const itemId = crypto.randomUUID();

    const { data: newItem, error } = await supabase
      .from('menu_items')
      .insert({
        id: itemId,
        canteen_id: canteen.id,
        name: name.trim(),
        category: category ? category.trim() : 'General',
        price: parseFloat(price),
        description: description ? description.trim() : null,
        stock_type: stockMode === 'CAPACITY' ? 'CAPACITY' : 'COUNT',
        current_stock: Math.max(0, stock),
        is_available: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase create menu item error: ${error.message}`);
    }

    if (stock > 0) {
      await supabase.from('stock_transactions').insert({
        id: crypto.randomUUID(),
        menu_item_id: itemId,
        quantity_change: stock,
        reason: 'Initial stock creation',
      });
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error('Create item error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create menu item in Supabase.' }, { status: 500 });
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

    const supabase = getServiceSupabase();
    const updatePayload: any = {};
    if (name) updatePayload.name = name.trim();
    if (category) updatePayload.category = category.trim();
    if (price !== undefined) updatePayload.price = parseFloat(price);
    if (active !== undefined) updatePayload.is_available = Boolean(active);
    if (description !== undefined) updatePayload.description = description.trim();
    if (stockMode) updatePayload.stock_type = stockMode;

    const { data: updated, error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase update menu item error: ${error.message}`);
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update menu item in Supabase.' }, { status: 500 });
  }
}

