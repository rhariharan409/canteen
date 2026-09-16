import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, requestedRole } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // SECURITY ENFORCEMENT: Self-signup role is ALWAYS STUDENT or OWNER (PENDING).
    // An owner is NEVER self-approved. Role is OWNER with status PENDING.
    const isOwnerRequest = requestedRole === 'OWNER';
    const role = isOwnerRequest ? 'OWNER' : 'STUDENT';
    const status = isOwnerRequest ? 'PENDING' : 'ACTIVE';

    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : null,
        role,
        status,
      },
    });

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
      name: user.name,
      role: 'STUDENT',
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
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
    return NextResponse.json({ error: 'Failed to create user account.' }, { status: 500 });
  }
}
