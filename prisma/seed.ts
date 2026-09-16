import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Campus Canteen database...');

  // Clear existing
  await prisma.notification.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.otpCredential.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.pickupBatch.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.capacitySettings.deleteMany();
  await prisma.canteen.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Campus System Admin',
      email: 'admin@campus.edu',
      password: hashedPassword,
      phone: '9876543210',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const owner1 = await prisma.user.create({
    data: {
      name: 'Ravi Kumar',
      email: 'ravi@maincanteen.edu',
      password: hashedPassword,
      phone: '9876543211',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const owner2 = await prisma.user.create({
    data: {
      name: 'Arun Kumar',
      email: 'arun@juiceshop.edu',
      password: hashedPassword,
      phone: '9876543212',
      role: 'OWNER',
      status: 'ACTIVE',
    },
  });

  const pendingOwner = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@bakery.edu',
      password: hashedPassword,
      phone: '9876543213',
      role: 'OWNER',
      status: 'PENDING',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Hariharan R',
      email: 'student@campus.edu',
      password: hashedPassword,
      phone: '9876543214',
      role: 'STUDENT',
      status: 'ACTIVE',
    },
  });

  // Create Canteens
  const mainCanteen = await prisma.canteen.create({
    data: {
      name: 'Main Canteen',
      location: 'Block A - Ground Floor',
      status: 'LIVE',
      ownerId: owner1.id,
      capacitySettings: {
        create: {
          maxActiveOrders: 100,
          maxPickupOrdersPerBatch: 40,
          prepCapacityPerBatch: 50,
          breakDurationMinutes: 15,
          isPaused: false,
        },
      },
    },
  });

  const juiceShop = await prisma.canteen.create({
    data: {
      name: 'Juice Shop',
      location: 'Block B - Quadrangle',
      status: 'LIVE',
      ownerId: owner2.id,
      capacitySettings: {
        create: {
          maxActiveOrders: 50,
          maxPickupOrdersPerBatch: 20,
          prepCapacityPerBatch: 30,
          breakDurationMinutes: 15,
          isPaused: false,
        },
      },
    },
  });

  const bakery = await prisma.canteen.create({
    data: {
      name: 'Campus Bakery',
      location: 'Student Activity Center',
      status: 'SETUP',
      ownerId: null, // Unassigned
      capacitySettings: {
        create: {
          maxActiveOrders: 40,
          maxPickupOrdersPerBatch: 15,
          prepCapacityPerBatch: 20,
          breakDurationMinutes: 15,
          isPaused: false,
        },
      },
    },
  });

  // Menu Items for Main Canteen
  const itemsMain = [
    { name: 'Samosa', category: 'Snacks', description: 'Crispy potato filled pastry', price: 15, stockMode: 'COUNT', currentStock: 50, dailyCapacity: 100 },
    { name: 'Tea', category: 'Drinks', description: 'Hot spiced milk tea', price: 10, stockMode: 'CAPACITY', currentStock: 100, dailyCapacity: 200 },
    { name: 'Vada', category: 'Snacks', description: 'Fried savory donut', price: 12, stockMode: 'COUNT', currentStock: 30, dailyCapacity: 80 },
    { name: 'Lemon Rice', category: 'Rice', description: 'Tangy rice meal with peanuts', price: 40, stockMode: 'COUNT', currentStock: 25, dailyCapacity: 50 },
    { name: 'Masala Dosa', category: 'Meals', description: 'Crispy crepe with potato filling', price: 50, stockMode: 'CAPACITY', currentStock: 40, dailyCapacity: 80 },
    { name: 'Veg Sandwich', category: 'Snacks', description: 'Fresh cucumber and tomato sandwich', price: 30, stockMode: 'COUNT', currentStock: 0, dailyCapacity: 40 },
  ];

  for (const item of itemsMain) {
    const created = await prisma.menuItem.create({
      data: {
        canteenId: mainCanteen.id,
        ...item,
      },
    });

    if (created.currentStock > 0) {
      await prisma.stockTransaction.create({
        data: {
          menuItemId: created.id,
          changeAmount: created.currentStock,
          previousStock: 0,
          newStock: created.currentStock,
          transactionType: 'INITIAL',
          note: 'Initial daily stock setup',
        },
      });
    }
  }

  // Menu Items for Juice Shop
  const itemsJuice = [
    { name: 'Fresh Orange Juice', category: 'Drinks', description: 'Cold pressed orange juice', price: 35, stockMode: 'CAPACITY', currentStock: 40, dailyCapacity: 60 },
    { name: 'Cold Coffee', category: 'Drinks', description: 'Chilled espresso with milk', price: 40, stockMode: 'CAPACITY', currentStock: 30, dailyCapacity: 50 },
    { name: 'Grilled Cheese Sandwich', category: 'Snacks', description: 'Toasted cheese sandwich', price: 45, stockMode: 'COUNT', currentStock: 15, dailyCapacity: 30 },
  ];

  for (const item of itemsJuice) {
    const created = await prisma.menuItem.create({
      data: {
        canteenId: juiceShop.id,
        ...item,
      },
    });

    if (created.currentStock > 0) {
      await prisma.stockTransaction.create({
        data: {
          menuItemId: created.id,
          changeAmount: created.currentStock,
          previousStock: 0,
          newStock: created.currentStock,
          transactionType: 'INITIAL',
          note: 'Initial daily stock setup',
        },
      });
    }
  }

  // Create an initial sample order for test pickup
  const batch = await prisma.pickupBatch.create({
    data: {
      canteenId: mainCanteen.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 5 * 60 * 1000),
      maxCapacity: 40,
      currentOrderCount: 1,
    },
  });

  const order = await prisma.order.create({
    data: {
      publicOrderCode: 'A247',
      studentId: student.id,
      canteenId: mainCanteen.id,
      batchId: batch.id,
      subtotal: 40,
      paymentStatus: 'PAID',
      orderStatus: 'READY',
      pickupWindow: '10:35 – 10:40',
      confirmedAt: new Date(),
      readyAt: new Date(),
      items: {
        create: [
          {
            menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Samosa' } }))!.id,
            itemName: 'Samosa',
            unitPrice: 15,
            quantity: 2,
            subtotal: 30,
          },
          {
            menuItemId: (await prisma.menuItem.findFirst({ where: { name: 'Tea' } }))!.id,
            itemName: 'Tea',
            unitPrice: 10,
            quantity: 1,
            subtotal: 10,
          },
        ],
      },
      otpCredential: {
        create: {
          otpCode: '5832',
          isUsed: false,
          attempts: 0,
        },
      },
      payment: {
        create: {
          razorpayOrderId: 'order_test_A247',
          razorpayPaymentId: 'pay_test_A247',
          razorpaySignature: 'sig_test_A247',
          status: 'SUCCESS',
          amount: 40,
        },
      },
    },
  });

  console.log('Seed completed successfully!');
  console.log('Demo Credentials:');
  console.log('  Admin: admin@campus.edu / password123');
  console.log('  Owner (Main Canteen): ravi@maincanteen.edu / password123');
  console.log('  Owner (Juice Shop): arun@juiceshop.edu / password123');
  console.log('  Student: student@campus.edu / password123');
  console.log(`  Sample Active Order Code: ${order.publicOrderCode} | OTP: 5832`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
