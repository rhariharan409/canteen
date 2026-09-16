import { NextRequest, NextResponse } from 'next/server';
import { supabaseSignup } from '@/lib/supabase-service';
import { signToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, requestedRole } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const isOwnerRequest = requestedRole === 'OWNER';

    const user = await supabaseSignup(
      name,
      email,
      password,
      phone || null,
      isOwnerRequest ? 'OWNER' : 'STUDENT'
    );

    if (isOwnerRequest) {
      return NextResponse.json({
        success: true,
        message: 'Owner registration submitted! Please wait for admin approval before logging in.',
        user: { id: user.id, email: user.email, status: 'PENDING' },
      });
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.full_name,
      role: 'STUDENT',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
      redirectUrl: '/student/home',
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
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user account on Supabase.' }, { status: 500 });
  }
}

