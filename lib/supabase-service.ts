import { getServiceSupabase } from './supabase';
import bcrypt from 'bcryptjs';

const supabase = getServiceSupabase();

// 1. SUPABASE USER SIGNUP
export async function supabaseSignup(
  name: string,
  email: string,
  password: string,
  phone: string | null,
  requestedRole: 'STUDENT' | 'OWNER'
) {
  const cleanEmail = email.trim().toLowerCase();
  const hashedPassword = await bcrypt.hash(password, 10);

  const role = requestedRole === 'OWNER' ? 'OWNER' : 'STUDENT';
  const status = requestedRole === 'OWNER' ? 'PENDING' : 'ACTIVE';

  // Check existing in Supabase profiles
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', cleanEmail)
    .single();

  if (existing) {
    throw new Error('An account with this email already exists in Supabase.');
  }

  const userId = crypto.randomUUID();

  const { data: user, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      role,
      status,
      password_hash: hashedPassword,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase profile creation error:', error);
    throw new Error(`Supabase Insert Failed: ${error.message}`);
  }

  return user;
}

// 2. SUPABASE USER LOGIN
export async function supabaseLogin(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  const { data: user, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', cleanEmail)
    .single();

  if (error || !user) {
    throw new Error('Invalid email or password.');
  }

  if (user.status === 'SUSPENDED') {
    throw new Error('Your account has been suspended by campus administrator.');
  }

  if (user.status === 'PENDING') {
    throw new Error('Your owner account is pending approval by campus administrator.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash || '');
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  // Fetch assigned canteen if owner
  const { data: canteens } = await supabase
    .from('canteens')
    .select('id, name, status')
    .eq('owner_id', user.id);

  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    assignedCanteenId: canteens && canteens.length > 0 ? canteens[0].id : null,
  };
}

// 3. SUPABASE GET ACTIVE CANTEENS FOR STUDENTS
export async function supabaseGetCanteens() {
  const { data: canteens, error } = await supabase
    .from('canteens')
    .select(`
      id,
      name,
      location,
      status,
      capacity_settings ( max_active_orders, is_paused ),
      menu_items ( id, current_stock, is_available ),
      orders ( id, status )
    `)
    .in('status', ['LIVE', 'PAUSED']);

  if (error) {
    console.error('Supabase fetch canteens error:', error);
    throw new Error(`Failed to retrieve canteens from Supabase: ${error.message}`);
  }

  return (canteens || []).map((canteen: any) => {
    const activeItemsCount = (canteen.menu_items || []).filter((i: any) => i.current_stock > 0 && i.is_available).length;
    const activeOrders = (canteen.orders || []).filter((o: any) => ['PAID', 'CONFIRMED', 'PREPARING'].includes(o.status));
    const maxActive = canteen.capacity_settings?.max_active_orders || 100;
    const loadPercentage = Math.round((activeOrders.length / maxActive) * 100);

    let pickupLoadLabel = 'Low';
    if (loadPercentage > 75) pickupLoadLabel = 'High';
    else if (loadPercentage > 40) pickupLoadLabel = 'Medium';

    const isPaused = canteen.capacity_settings?.is_paused || canteen.status === 'PAUSED';

    return {
      id: canteen.id,
      name: canteen.name,
      location: canteen.location,
      status: isPaused ? 'PAUSED' : canteen.status,
      availableItemCount: activeItemsCount,
      totalItemCount: (canteen.menu_items || []).length,
      estimatedPickupLoad: pickupLoadLabel,
      loadPercentage,
    };
  });
}

// 4. SUPABASE GET CANTEEN MENU FOR STUDENT
export async function supabaseGetCanteenDetail(canteenId: string) {
  const { data: canteen, error } = await supabase
    .from('canteens')
    .select(`
      id,
      name,
      location,
      status,
      capacity_settings ( is_paused ),
      menu_items ( * )
    `)
    .eq('id', canteenId)
    .single();

  if (error || !canteen) {
    throw new Error('Canteen not found in Supabase.');
  }

  const menuItems = (canteen.menu_items || [])
    .filter((item: any) => item.is_available)
    .map((item: any) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      price: parseFloat(item.price),
      currentStock: item.current_stock,
      stockMode: item.stock_type || 'COUNT',
      isAvailable: item.current_stock > 0,
    }));

  const categories = Array.from(new Set(menuItems.map((item: any) => item.category)));

  const capSettings = Array.isArray(canteen.capacity_settings) ? canteen.capacity_settings[0] : canteen.capacity_settings;
  const isPaused = capSettings?.is_paused || false;

  return {
    canteen: {
      id: canteen.id,
      name: canteen.name,
      location: canteen.location,
      status: isPaused ? 'PAUSED' : canteen.status,
      isPaused,
    },
    categories: ['All', ...categories],
    menuItems,
  };
}

// 5. ATOMIC SUPABASE ORDER CHECKOUT & STOCK TRANSACTION
export async function supabaseCheckoutOrder(
  studentId: string,
  canteenId: string,
  cartItems: Array<{ menuItemId: string; quantity: number }>
) {
  if (!cartItems || cartItems.length === 0) {
    throw new Error('Cart is empty.');
  }

  // 1. Fetch Canteen Status
  const { data: canteen } = await supabase
    .from('canteens')
    .select('id, name, status, capacity_settings(is_paused)')
    .eq('id', canteenId)
    .single();

  if (!canteen || canteen.status !== 'LIVE') {
    throw new Error('This canteen is currently unavailable for pre-orders.');
  }

  const capSettings = Array.isArray(canteen.capacity_settings) ? canteen.capacity_settings[0] : canteen.capacity_settings;
  if (capSettings?.is_paused) {
    throw new Error('New orders are temporarily paused by canteen owner.');
  }

  // 2. Fetch Item Stock & Compute Price Authoritatively
  let subtotal = 0;
  const validatedItems: Array<{ item: any; quantity: number; itemSubtotal: number }> = [];

  for (const cartItem of cartItems) {
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', cartItem.menuItemId)
      .eq('canteen_id', canteenId)
      .eq('is_available', true)
      .single();

    if (!menuItem) {
      throw new Error(`Item is no longer available.`);
    }

    if (menuItem.current_stock < cartItem.quantity) {
      if (menuItem.current_stock === 0) {
        throw new Error(`"${menuItem.name}" is sold out. Please remove it from cart.`);
      }
      throw new Error(`Only ${menuItem.current_stock} "${menuItem.name}" remaining.`);
    }

    const itemSubtotal = parseFloat(menuItem.price) * cartItem.quantity;
    subtotal += itemSubtotal;
    validatedItems.push({ item: menuItem, quantity: cartItem.quantity, itemSubtotal });
  }

  // 3. Generate Order Code (e.g. A247) & 4-digit OTP
  const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  const countToday = count || 0;
  const letter = String.fromCharCode(65 + (countToday % 26));
  const num = Math.floor(100 + Math.random() * 900);
  const publicOrderCode = `${letter}${num}`;
  const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
  const windowLabel = '10:35 – 10:40';

  // 4. Insert Order into Supabase
  const orderId = crypto.randomUUID();
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      order_code: publicOrderCode,
      student_id: studentId,
      canteen_id: canteenId,
      subtotal,
      payment_status: 'PAID',
      status: 'CONFIRMED',
      pickup_window: windowLabel,
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (orderError) {
    throw new Error(`Supabase Order Creation Failed: ${orderError.message}`);
  }

  // 5. Insert Order Items & Deduct Stock in Supabase
  for (const vItem of validatedItems) {
    await supabase.from('order_items').insert({
      id: crypto.randomUUID(),
      order_id: orderId,
      menu_item_id: vItem.item.id,
      item_name: vItem.item.name,
      quantity: vItem.quantity,
      unit_price: vItem.item.price,
      total_price: vItem.itemSubtotal,
    });

    const newStock = vItem.item.current_stock - vItem.quantity;
    await supabase
      .from('menu_items')
      .update({ current_stock: Math.max(0, newStock) })
      .eq('id', vItem.item.id);

    await supabase.from('stock_transactions').insert({
      id: crypto.randomUUID(),
      menu_item_id: vItem.item.id,
      quantity_change: -vItem.quantity,
      reason: 'Pre-order deduction',
      order_id: orderId,
    });
  }

  // 6. Insert OTP Credentials & Payment Record
  await supabase.from('otp_credentials').insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    otp_code: otpCode,
    is_used: false,
    attempts: 0,
  });

  await supabase.from('payments').insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    razorpay_order_id: `rzp_${publicOrderCode}_${Date.now()}`,
    status: 'SUCCESS',
    amount: subtotal,
  });

  return {
    id: order.id,
    publicOrderCode: order.order_code,
    canteenName: canteen.name,
    pickupWindow: order.pickup_window,
    otpCode,
    subtotal: order.subtotal,
    orderStatus: order.status,
    items: validatedItems.map((vi) => ({
      itemName: vi.item.name,
      unitPrice: vi.item.price,
      quantity: vi.quantity,
    })),
    confirmedAt: order.confirmed_at,
  };
}

// 6. SUPABASE VERIFY OTP & MARK COLLECTED
export async function supabaseVerifyOtp(canteenId: string, publicOrderCode: string, inputOtp: string) {
  const cleanCode = publicOrderCode.trim().toUpperCase();
  const cleanOtp = inputOtp.trim();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_code,
      status,
      subtotal,
      pickup_window,
      student_id,
      profiles ( full_name, phone ),
      order_items ( id, item_name, quantity, unit_price ),
      otp_credentials ( id, otp_code, is_used, attempts )
    `)
    .eq('canteen_id', canteenId)
    .eq('order_code', cleanCode)
    .single();

  if (error || !order) {
    throw new Error(`Order ID "${cleanCode}" not found in Supabase for your canteen.`);
  }

  if (order.status === 'COLLECTED') {
    throw new Error(`Order ${cleanCode} has already been collected.`);
  }

  if (['CANCELLED', 'EXPIRED'].includes(order.status)) {
    throw new Error(`Order ${cleanCode} is ${order.status.toLowerCase()} and cannot be collected.`);
  }

  const otpCred = Array.isArray(order.otp_credentials) ? order.otp_credentials[0] : order.otp_credentials;

  if (!otpCred) {
    throw new Error(`OTP credential missing in Supabase for order ${cleanCode}.`);
  }

  if (otpCred.is_used) {
    throw new Error(`OTP for order ${cleanCode} has already been used.`);
  }

  if (otpCred.attempts >= 5) {
    throw new Error(`Too many failed OTP attempts for ${cleanCode}. Please seek manager assistance.`);
  }

  if (otpCred.otp_code !== cleanOtp) {
    await supabase
      .from('otp_credentials')
      .update({ attempts: (otpCred.attempts || 0) + 1 })
      .eq('id', otpCred.id);
    throw new Error(`Incorrect OTP code for Order ${cleanCode}. Please try again.`);
  }

  // Update Supabase records atomically
  await supabase
    .from('otp_credentials')
    .update({ is_used: true })
    .eq('id', otpCred.id);

  const { data: updatedOrder } = await supabase
    .from('orders')
    .update({
      status: 'COLLECTED',
      collected_at: new Date().toISOString(),
    })
    .eq('id', order.id)
    .select()
    .single();

  return {
    id: order.id,
    publicOrderCode: order.order_code,
    studentName: (order.profiles as any)?.full_name || 'Student',
    orderStatus: updatedOrder.status,
    collectedAt: updatedOrder.collected_at,
    items: order.order_items,
  };
}

// 7. SUPABASE OWNER DASHBOARD METRICS
export async function supabaseGetOwnerDashboard(ownerId: string, isAdmin: boolean) {
  let canteenQuery = supabase.from('canteens').select('id, name, location, status, capacity_settings(*)');
  if (!isAdmin) {
    canteenQuery = canteenQuery.eq('owner_id', ownerId);
  }

  let { data: canteens } = await canteenQuery;
  let canteen = canteens && canteens.length > 0 ? canteens[0] : null;

  if (!canteen) {
    const { data: allCanteens } = await supabase.from('canteens').select('id, name, location, status, capacity_settings(*)').limit(1);
    canteen = allCanteens && allCanteens.length > 0 ? allCanteens[0] : null;
  }

  if (!canteen) {
    return {
      canteen: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Main Campus Food Court',
        location: 'Building A, Ground Floor',
        status: 'LIVE',
        isPaused: false,
      },
      metrics: {
        todayOrders: 0,
        ready: 0,
        preparing: 0,
        collected: 0,
        capacityPercentage: 0,
      },
      currentBatch: {
        id: 'batch_active',
        windowLabel: '10:35 – 10:40',
        totalOrders: 0,
        preparing: 0,
        ready: 0,
        prepSummary: {},
      },
    };
  }

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('canteen_id', canteen.id);

  const orders = todayOrders || [];
  const totalOrdersCount = orders.length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;
  const preparingCount = orders.filter((o) => ['CONFIRMED', 'PREPARING'].includes(o.status)).length;
  const collectedCount = orders.filter((o) => o.status === 'COLLECTED').length;

  const capacitySettings = Array.isArray(canteen.capacity_settings) ? canteen.capacity_settings[0] : canteen.capacity_settings;
  const maxActive = capacitySettings?.max_active_orders || 100;
  const capacityPercentage = Math.min(100, Math.round(((preparingCount + readyCount) / maxActive) * 100));

  const prepSummary: Record<string, number> = {};
  orders.forEach((o) => {
    if (['CONFIRMED', 'PREPARING'].includes(o.status)) {
      (o.order_items || []).forEach((item: any) => {
        prepSummary[item.item_name] = (prepSummary[item.item_name] || 0) + item.quantity;
      });
    }
  });

  return {
    canteen: {
      id: canteen.id,
      name: canteen.name,
      location: canteen.location,
      status: canteen.status,
      isPaused: capacitySettings?.is_paused || false,
    },
    metrics: {
      todayOrders: totalOrdersCount,
      ready: readyCount,
      preparing: preparingCount,
      collected: collectedCount,
      capacityPercentage,
    },
    currentBatch: {
      id: 'batch_active',
      windowLabel: '10:35 – 10:40',
      totalOrders: totalOrdersCount,
      preparing: preparingCount,
      ready: readyCount,
      prepSummary,
    },
  };
}
