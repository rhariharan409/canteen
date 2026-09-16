import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseGetOwnerDashboard } from '@/lib/supabase-service';
import { getServiceSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const dashboardData = await supabaseGetOwnerDashboard(auth.user.id, auth.user.role === 'ADMIN');
    return NextResponse.json(dashboardData);
  } catch (error: any) {
    console.error('Owner Dashboard API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load dashboard metrics from Supabase.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { action } = await req.json();
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

    if (action === 'PAUSE_ORDERS' || action === 'RESUME_ORDERS') {
      const isPaused = action === 'PAUSE_ORDERS';

      // Upsert into capacity_settings in Supabase
      const { data: existingSettings } = await supabase
        .from('capacity_settings')
        .select('id')
        .eq('canteen_id', canteen.id)
        .single();

      if (existingSettings) {
        await supabase
          .from('capacity_settings')
          .update({ is_paused: isPaused, updated_at: new Date().toISOString() })
          .eq('canteen_id', canteen.id);
      } else {
        await supabase.from('capacity_settings').insert({
          id: crypto.randomUUID(),
          canteen_id: canteen.id,
          is_paused: isPaused,
        });
      }

      return NextResponse.json({
        success: true,
        message: isPaused ? 'Orders temporarily paused in Supabase.' : 'Orders resumed in Supabase.',
        isPaused,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (error: any) {
    console.error('Owner Dashboard Action Error:', error);
    return NextResponse.json({ error: error.message || 'Action failed on Supabase.' }, { status: 500 });
  }
}

