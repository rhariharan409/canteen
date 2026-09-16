-- iCampus Canteen - Production PostgreSQL Schema & RLS Policies

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE (Syncs with Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'OWNER', 'ADMIN')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CANTEENS TABLE
CREATE TABLE IF NOT EXISTS canteens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'LIVE' CHECK (status IN ('SETUP', 'READY', 'LIVE', 'PAUSED', 'CLOSED', 'DEACTIVATED')),
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAPACITY SETTINGS
CREATE TABLE IF NOT EXISTS capacity_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_id UUID UNIQUE NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  max_active_orders INT NOT NULL DEFAULT 100,
  max_pickup_orders_per_batch INT NOT NULL DEFAULT 40,
  prep_capacity_per_batch INT NOT NULL DEFAULT 50,
  break_duration_minutes INT NOT NULL DEFAULT 15,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_id UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  stock_type TEXT NOT NULL DEFAULT 'COUNT' CHECK (stock_type IN ('COUNT', 'CAPACITY')),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PICKUP BATCHES
CREATE TABLE IF NOT EXISTS pickup_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canteen_id UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  capacity INT NOT NULL DEFAULT 40,
  current_count INT NOT NULL DEFAULT 0 CHECK (current_count >= 0),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_code TEXT NOT NULL,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  canteen_id UUID NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES pickup_batches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CART', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'COLLECTED', 'EXPIRED', 'CANCELLED')),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  pickup_window TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  ready_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL
);

-- 9. OTP CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS otp_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  otp_code TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  razorpay_order_id TEXT NOT NULL,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. STOCK TRANSACTIONS
CREATE TABLE IF NOT EXISTS stock_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity_change INT NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. INDEXES FOR BREAK-TIME HIGH TRAFFIC
CREATE INDEX IF NOT EXISTS idx_orders_student_id ON orders(student_id);
CREATE INDEX IF NOT EXISTS idx_orders_canteen_id ON orders(canteen_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_menu_items_canteen_id ON menu_items(canteen_id);
CREATE INDEX IF NOT EXISTS idx_pickup_batches_canteen ON pickup_batches(canteen_id, start_time);

-- 13. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_credentials ENABLE ROW LEVEL SECURITY;

-- 14. RLS POLICIES
-- Profiles RLS
CREATE POLICY "Public Profiles Read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users Update Self Profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Canteens RLS
CREATE POLICY "Canteens Public Read" ON canteens FOR SELECT USING (status IN ('LIVE', 'PAUSED'));
CREATE POLICY "Owner Canteen Manage" ON canteens FOR ALL USING (owner_id = auth.uid());

-- Menu Items RLS
CREATE POLICY "Menu Items Public Read" ON menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Owner Menu Manage" ON menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM canteens WHERE id = menu_items.canteen_id AND owner_id = auth.uid())
);

-- Orders RLS
CREATE POLICY "Student Orders Read Own" ON orders FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Owner Orders Read Assigned" ON orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM canteens WHERE id = orders.canteen_id AND owner_id = auth.uid())
);
CREATE POLICY "Owner Orders Update Status" ON orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM canteens WHERE id = orders.canteen_id AND owner_id = auth.uid())
);

-- 15. ATOMIC CHECKOUT & STOCK DEDUCTION RPC FUNCTION
CREATE OR REPLACE FUNCTION create_canteen_order(
  p_student_id UUID,
  p_canteen_id UUID,
  p_cart_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canteen_status TEXT;
  v_is_paused BOOLEAN;
  v_item RECORD;
  v_menu_item RECORD;
  v_subtotal NUMERIC(10,2) := 0;
  v_order_id UUID;
  v_order_code TEXT;
  v_otp_code TEXT;
  v_window_label TEXT;
  v_batch_id UUID;
  v_count INT;
BEGIN
  -- Check Canteen Availability
  SELECT status INTO v_canteen_status FROM canteens WHERE id = p_canteen_id;
  IF v_canteen_status IS NULL OR v_canteen_status != 'LIVE' THEN
    RAISE EXCEPTION 'This canteen is currently unavailable for pre-orders.';
  END IF;

  SELECT is_paused INTO v_is_paused FROM capacity_settings WHERE canteen_id = p_canteen_id;
  IF v_is_paused = TRUE THEN
    RAISE EXCEPTION 'New orders are temporarily paused by canteen owner.';
  END IF;

  -- Validate Items & Stock Atomically
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(menu_item_id UUID, quantity INT)
  LOOP
    SELECT * INTO v_menu_item FROM menu_items WHERE id = v_item.menu_item_id AND canteen_id = p_canteen_id AND is_available = TRUE FOR UPDATE;
    IF v_menu_item IS NULL THEN
      RAISE EXCEPTION 'Item is no longer available.';
    END IF;
    IF v_menu_item.current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Only % units of "%" remaining.', v_menu_item.current_stock, v_menu_item.name;
    END IF;
    v_subtotal := v_subtotal + (v_menu_item.price * v_item.quantity);
  END LOOP;

  -- Generate Code & OTP
  SELECT COUNT(*) INTO v_count FROM orders;
  v_order_code := CHR(65 + (v_count % 26)) || (100 + FLOOR(RANDOM() * 900))::TEXT;
  v_otp_code := (1000 + FLOOR(RANDOM() * 9000))::TEXT;
  v_window_label := '10:35 – 10:40';

  -- Create Order
  INSERT INTO orders (order_code, student_id, canteen_id, subtotal, payment_status, status, pickup_window)
  VALUES (v_order_code, p_student_id, p_canteen_id, v_subtotal, 'PAID', 'CONFIRMED', v_window_label)
  RETURNING id INTO v_order_id;

  -- Create Items & Deduct Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(menu_item_id UUID, quantity INT)
  LOOP
    SELECT * INTO v_menu_item FROM menu_items WHERE id = v_item.menu_item_id;
    INSERT INTO order_items (order_id, menu_item_id, item_name, quantity, unit_price, total_price)
    VALUES (v_order_id, v_menu_item.id, v_menu_item.name, v_item.quantity, v_menu_item.price, v_menu_item.price * v_item.quantity);

    UPDATE menu_items SET current_stock = current_stock - v_item.quantity WHERE id = v_menu_item.id;

    INSERT INTO stock_transactions (menu_item_id, quantity_change, reason, order_id)
    VALUES (v_menu_item.id, -v_item.quantity, 'Pre-order deduction', v_order_id);
  END LOOP;

  -- Create OTP & Payment
  INSERT INTO otp_credentials (order_id, otp_code) VALUES (v_order_id, v_otp_code);
  INSERT INTO payments (order_id, razorpay_order_id, amount) VALUES (v_order_id, 'rzp_pay_' || v_order_code, v_subtotal);

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_code', v_order_code,
    'otp_code', v_otp_code,
    'pickup_window', v_window_label,
    'subtotal', v_subtotal
  );
END;
$$;
