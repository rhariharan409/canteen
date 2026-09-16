import { NextRequest, NextResponse } from 'next/server';
import { supabaseLogin } from '@/lib/supabase-service';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const user = await supabaseLogin(email, password);

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    });

    let redirectUrl = '/student/home';
    if (user.role === 'OWNER') {
      redirectUrl = '/owner/dashboard';
    } else if (user.role === 'ADMIN') {
      redirectUrl = '/admin/dashboard';
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        assignedCanteenId: user.assignedCanteenId || null,
      },
      redirectUrl,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process login.' }, { status: 401 });
  }
}

