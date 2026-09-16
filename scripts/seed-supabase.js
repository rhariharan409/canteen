const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret);

async function seedSupabase() {
  console.log('Seeding Supabase PostgreSQL database...');

  try {
    const canteenId = '11111111-1111-4111-8111-111111111111';
    const { data: existingCanteen } = await supabase
      .from('canteens')
      .select('id')
      .eq('id', canteenId)
      .single();

    if (!existingCanteen) {
      const { error: cErr } = await supabase.from('canteens').insert({
        id: canteenId,
        name: 'Main Campus Food Court',
        description: 'Primary campus canteen offering hot meals, snacks, and beverages.',
        location: 'Building A, Ground Floor',
        status: 'LIVE',
      });
      if (cErr) console.error('Error inserting canteen:', cErr);
      else console.log('Inserted default canteen into Supabase!');
    }

    const { data: existingCap } = await supabase
      .from('capacity_settings')
      .select('id')
      .eq('canteen_id', canteenId)
      .single();

    if (!existingCap) {
      await supabase.from('capacity_settings').insert({
        id: crypto.randomUUID(),
        canteen_id: canteenId,
        max_active_orders: 100,
        max_pickup_orders_per_batch: 40,
        prep_capacity_per_batch: 50,
        break_duration_minutes: 15,
        is_paused: false,
      });
      console.log('Inserted capacity settings into Supabase!');
    }

    const menuItems = [
      { name: 'Paneer Butter Masala Combo', category: 'Meals', price: 120, current_stock: 45 },
      { name: 'Crispy Veg Burger', category: 'Snacks', price: 65, current_stock: 30 },
      { name: 'Cold Coffee with Ice Cream', category: 'Beverages', price: 50, current_stock: 60 },
      { name: 'Samosa Chat (2 Pcs)', category: 'Snacks', price: 40, current_stock: 25 },
      { name: 'Chicken Biryani Special', category: 'Meals', price: 140, current_stock: 50 },
      { name: 'Fresh Mango Smoothie', category: 'Beverages', price: 45, current_stock: 20 },
    ];

    for (const item of menuItems) {
      const { data: existingItem } = await supabase
        .from('menu_items')
        .select('id')
        .eq('canteen_id', canteenId)
        .eq('name', item.name)
        .single();

      if (!existingItem) {
        await supabase.from('menu_items').insert({
          id: crypto.randomUUID(),
          canteen_id: canteenId,
          name: item.name,
          category: item.category,
          price: item.price,
          current_stock: item.current_stock,
          stock_type: 'COUNT',
          is_available: true,
        });
        console.log(`Inserted menu item: ${item.name}`);
      }
    }

    console.log('Supabase seeding finished successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seedSupabase();
