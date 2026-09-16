import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { verifyOtpAndCompletePickup } from '@/lib/canteen-service';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { publicOrderCode, otpCode, action } = await req.json();

    if (!publicOrderCode) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const canteen = await db.canteen.findFirst({
      where: auth.user.role === 'ADMIN' ? {} : { ownerId: auth.user.id },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned to your account.' }, { status: 404 });
    }

    // Step 1: Preview / Lookup Order before final completion
    if (action === 'PREVIEW') {
      const cleanCode = publicOrderCode.trim().toUpperCase();
      const order = await db.order.findFirst({
        where: {
          canteenId: canteen.id,
          publicOrderCode: cleanCode,
        },
        include: {
          student: { select: { name: true, phone: true } },
          items: true,
          otpCredential: { select: { otpCode: true, isUsed: true, attempts: true } },
        },
      });

      if (!order) {
        return NextResponse.json({ error: `Order ID "${cleanCode}" not found for this canteen.` }, { status: 404 });
      }

      if (order.orderStatus === 'COLLECTED') {
        return NextResponse.json({ error: `Order ${cleanCode} has already been collected.` }, { status: 400 });
      }

      if (otpCode && order.otpCredential && order.otpCredential.otpCode !== otpCode.trim()) {
        await db.otpCredential.update({
          where: { orderId: order.id },
          data: { attempts: { increment: 1 } },
        });
        return NextResponse.json({ error: 'Incorrect OTP. Please try again.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        order: {
          id: order.id,
          publicOrderCode: order.publicOrderCode,
          studentName: order.student.name,
          studentPhone: order.student.phone,
          orderStatus: order.orderStatus,
          subtotal: order.subtotal,
          pickupWindow: order.pickupWindow,
          otpCode: order.otpCredential?.otpCode,
          items: order.items,
        },
      });
    }

    // Step 2: Finalize Pickup Verification & Mark COLLECTED
    if (!otpCode) {
      return NextResponse.json({ error: 'OTP is required to complete pickup.' }, { status: 400 });
    }

    const completedOrder = await verifyOtpAndCompletePickup(canteen.id, publicOrderCode, otpCode);

    return NextResponse.json({
      success: true,
      message: `Pickup verified successfully for Order ${completedOrder.publicOrderCode}!`,
      order: {
        id: completedOrder.id,
        publicOrderCode: completedOrder.publicOrderCode,
        studentName: completedOrder.student.name,
        orderStatus: completedOrder.orderStatus,
        collectedAt: completedOrder.collectedAt,
        items: completedOrder.items,
      },
    });
  } catch (error: any) {
    console.error('OTP Verification Error:', error);
    return NextResponse.json({ error: error.message || 'OTP Verification failed.' }, { status: 400 });
  }
}
