import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'campus_canteen_super_secret_jwt_key_2026_prod';

export type Role = 'STUDENT' | 'OWNER' | 'ADMIN';

export interface UserTokenPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export function signToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserTokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(req: NextRequest) {
  const tokenCookie = req.cookies.get('token')?.value;
  const authHeader = req.headers.get('authorization');
  const token = tokenCookie || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      canteens: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
    },
  });

  if (!user || user.status === 'SUSPENDED') return null;
  return {
    ...user,
    role: user.role as Role,
  };
}

export async function requireAuth(req: NextRequest, allowedRoles?: Role[]) {
  const user = await getCurrentUser(req);

  if (!user) {
    return { error: 'Unauthorized: Please log in.', status: 401, user: null };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return { error: 'Forbidden: Insufficient permissions for this action.', status: 403, user: null };
  }

  return { error: null, status: 200, user };
}

export async function requireOwnerOfCanteen(req: NextRequest, canteenId: string) {
  const { error, status, user } = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (error || !user) return { error, status, user: null, canteen: null };

  if (user.role === 'ADMIN') {
    const canteen = await db.canteen.findUnique({ where: { id: canteenId } });
    if (!canteen) return { error: 'Canteen not found', status: 404, user: null, canteen: null };
    return { error: null, status: 200, user, canteen };
  }

  const canteen = await db.canteen.findFirst({
    where: {
      id: canteenId,
      ownerId: user.id,
    },
  });

  if (!canteen) {
    return { error: 'Forbidden: You do not own or manage this canteen.', status: 403, user: null, canteen: null };
  }

  return { error: null, status: 200, user, canteen };
}
