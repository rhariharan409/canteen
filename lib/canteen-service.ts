import { db } from './db';

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export const OrderStatus = {
  CART: 'CART',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  PREPARING: 'PREPARING',
  READY: 'READY',
  COLLECTED: 'COLLECTED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
} as const;

export interface CartItemInput {
  menuItemId: string;
  quantity: number;
}

export async function calculateNextPickupBatch(canteenId: string) {
  const capacitySettings = await db.capacitySettings.findUnique({
    where: { canteenId },
  });

  const maxActive = capacitySettings?.maxActiveOrders ?? 100;
  const maxPerBatch = capacitySettings?.maxPickupOrdersPerBatch ?? 40;
  const isPaused = capacitySettings?.isPaused ?? false;

  if (isPaused) {
    throw new Error('New orders are temporarily paused by canteen owner.');
  }

  // Count active orders
  const activeOrderCount = await db.order.count({
    where: {
      canteenId,
      orderStatus: { in: ['PAID', 'CONFIRMED', 'PREPARING'] },
    },
  });

  if (activeOrderCount >= maxActive) {
    throw new Error('Pickup capacity reached for this period. Please try again in a few minutes.');
  }

  // Determine current 5-minute time window
  const now = new Date();
  const prepOffsetMinutes = 5; // minimum prep lead time
  const targetTime = new Date(now.getTime() + prepOffsetMinutes * 60 * 1000);

  // Round up to nearest 5 minutes
  const minutes = targetTime.getMinutes();
  const remainder = minutes % 5;
  const roundedMinutes = minutes + (remainder === 0 ? 0 : 5 - remainder);
  targetTime.setMinutes(roundedMinutes, 0, 0);

  // Find a batch that has capacity
  let selectedBatch = null;
  let batchStart = new Date(targetTime);

  for (let i = 0; i < 6; i++) {
    const batchEnd = new Date(batchStart.getTime() + 5 * 60 * 1000);

    let batch = await db.pickupBatch.findFirst({
      where: {
        canteenId,
        startTime: batchStart,
      },
    });

    if (!batch) {
      batch = await db.pickupBatch.create({
        data: {
          canteenId,
          startTime: batchStart,
          endTime: batchEnd,
          maxCapacity: maxPerBatch,
          currentOrderCount: 0,
        },
      });
    }

    if (batch.currentOrderCount < maxPerBatch) {
      selectedBatch = batch;
      break;
    }

    // Try next 5-minute slot
    batchStart = new Date(batchEnd);
  }

  if (!selectedBatch) {
    throw new Error('All upcoming pickup windows are fully booked. Please try again shortly.');
  }

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const windowLabel = `${formatTime(selectedBatch.startTime)} – ${formatTime(selectedBatch.endTime)}`;

  return {
    batchId: selectedBatch.id,
    windowLabel,
  };
}

export async function executeAtomicOrderCheckout(
  studentId: string,
  canteenId: string,
  cartItems: CartItemInput[]
) {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty.');
  }

  // Verify canteen status
  const canteen = await db.canteen.findUnique({
    where: { id: canteenId },
  });

  if (!canteen || canteen.status !== 'LIVE') {
    throw new Error('This canteen is currently unavailable for pre-orders.');
  }

  return await db.$transaction(async (tx) => {
    let subtotal = 0;
    const validatedItems: Array<{
      menuItem: any;
      quantity: number;
      itemSubtotal: number;
    }> = [];

    // 1. Fetch menu items & validate stock atomically
    for (const item of cartItems) {
      const menuItem = await tx.menuItem.findFirst({
        where: {
          id: item.menuItemId,
          canteenId,
          active: true,
        },
      });

      if (!menuItem) {
        throw new Error(`Item is no longer available.`);
      }

      if (menuItem.currentStock < item.quantity) {
        if (menuItem.currentStock === 0) {
          throw new Error(`"${menuItem.name}" is sold out. Please remove it from your cart.`);
        }
        throw new Error(
          `Only ${menuItem.currentStock} "${menuItem.name}" remaining. Please update your cart.`
        );
      }

      const itemSubtotal = menuItem.price * item.quantity;
      subtotal += itemSubtotal;

      validatedItems.push({
        menuItem,
        quantity: item.quantity,
        itemSubtotal,
      });
    }

    // 2. Calculate Pickup Batch
    const batchInfo = await calculateNextPickupBatch(canteenId);

    // 3. Deduct Stock & Create Stock Transaction Logs
    for (const vItem of validatedItems) {
      const prevStock = vItem.menuItem.currentStock;
      const newStock = prevStock - vItem.quantity;

      await tx.menuItem.update({
        where: { id: vItem.menuItem.id },
        data: { currentStock: newStock },
      });

      await tx.stockTransaction.create({
        data: {
          menuItemId: vItem.menuItem.id,
          changeAmount: -vItem.quantity,
          previousStock: prevStock,
          newStock,
          transactionType: 'ORDER_DEDUCTION',
          note: `Order pre-order deduction`,
        },
      });
    }

    // 4. Update Pickup Batch Order Count
    await tx.pickupBatch.update({
      where: { id: batchInfo.batchId },
      data: { currentOrderCount: { increment: 1 } },
    });

    // 5. Generate Public Order Code (e.g. A247) & 4-digit OTP
    const countToday = await tx.order.count();
    const letter = String.fromCharCode(65 + (countToday % 26)); // A-Z
    const num = Math.floor(100 + Math.random() * 900);
    const publicOrderCode = `${letter}${num}`;

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();

    // 6. Create Order and relations
    const order = await tx.order.create({
      data: {
        publicOrderCode,
        studentId,
        canteenId,
        batchId: batchInfo.batchId,
        subtotal,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.CONFIRMED,
        pickupWindow: batchInfo.windowLabel,
        confirmedAt: new Date(),
        items: {
          create: validatedItems.map((vi) => ({
            menuItemId: vi.menuItem.id,
            itemName: vi.menuItem.name,
            unitPrice: vi.menuItem.price,
            quantity: vi.quantity,
            subtotal: vi.itemSubtotal,
          })),
        },
        otpCredential: {
          create: {
            otpCode,
            isUsed: false,
          },
        },
        payment: {
          create: {
            razorpayOrderId: `rzp_order_${Date.now()}_${publicOrderCode}`,
            razorpayPaymentId: `pay_${Date.now()}_${publicOrderCode}`,
            razorpaySignature: `sig_verified_${Date.now()}`,
            status: 'SUCCESS',
            amount: subtotal,
          },
        },
      },
      include: {
        items: true,
        otpCredential: true,
        canteen: {
          select: { name: true, location: true },
        },
      },
    });

    // 7. Create Notification for Student
    await tx.notification.create({
      data: {
        userId: studentId,
        title: 'Order Confirmed!',
        message: `Order ${publicOrderCode} confirmed. Pickup Window: ${batchInfo.windowLabel}. OTP: ${otpCode}`,
        type: 'ORDER_CONFIRMED',
      },
    });

    return order;
  });
}

export async function verifyOtpAndCompletePickup(
  canteenId: string,
  publicOrderCode: string,
  inputOtp: string
) {
  const cleanCode = publicOrderCode.trim().toUpperCase();
  const cleanOtp = inputOtp.trim();

  const order = await db.order.findFirst({
    where: {
      canteenId,
      publicOrderCode: cleanCode,
    },
    include: {
      otpCredential: true,
      student: { select: { name: true, phone: true } },
      items: true,
    },
  });

  if (!order) {
    throw new Error(`Order ID "${cleanCode}" not found for your canteen.`);
  }

  if (order.orderStatus === 'COLLECTED') {
    throw new Error(`Order ${cleanCode} has already been collected.`);
  }

  if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'EXPIRED') {
    throw new Error(`Order ${cleanCode} is ${order.orderStatus.toLowerCase()} and cannot be collected.`);
  }

  if (!order.otpCredential) {
    throw new Error(`OTP credential missing for order ${cleanCode}.`);
  }

  if (order.otpCredential.isUsed) {
    throw new Error(`OTP for order ${cleanCode} has already been used.`);
  }

  if (order.otpCredential.attempts >= 5) {
    throw new Error(`Too many failed OTP attempts for ${cleanCode}. Please request manager assistance.`);
  }

  if (order.otpCredential.otpCode !== cleanOtp) {
    await db.otpCredential.update({
      where: { id: order.otpCredential.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error(`Incorrect OTP code for Order ${cleanCode}. Please try again.`);
  }

  // Mark OTP as used and Order as COLLECTED
  await db.otpCredential.update({
    where: { id: order.otpCredential.id },
    data: { isUsed: true },
  });

  const updatedOrder = await db.order.update({
    where: { id: order.id },
    data: {
      orderStatus: 'COLLECTED',
      collectedAt: new Date(),
    },
    include: {
      items: true,
      student: { select: { name: true, phone: true } },
    },
  });

  // Create notification
  await db.notification.create({
    data: {
      userId: order.studentId,
      title: 'Order Picked Up!',
      message: `Your order ${cleanCode} has been marked as collected. Enjoy your meal!`,
      type: 'ORDER_COLLECTED',
    },
  });

  return updatedOrder;
}
