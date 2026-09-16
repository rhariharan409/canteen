import { NextRequest, NextResponse } from 'next/server';
import { supabaseGetCanteens } from '@/lib/supabase-service';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formatted = await supabaseGetCanteens();
    return NextResponse.json({ canteens: formatted });
  } catch (error: any) {
    console.error('Error fetching canteens from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve canteens from Supabase.' }, { status: 500 });
  }
}

