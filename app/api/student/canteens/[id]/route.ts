import { NextRequest, NextResponse } from 'next/server';
import { supabaseGetCanteenDetail } from '@/lib/supabase-service';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const detail = await supabaseGetCanteenDetail(params.id);
    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('Error fetching canteen menu from Supabase:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve menu.' }, { status: 500 });
  }
}

