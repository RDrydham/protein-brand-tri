const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Seed Default Admin User
  const adminEmail = 'admin@atriwellness.com';
  const hashedPassword = await bcrypt.hash('adminpassword123', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'admin'
    }
  });
  console.log(`Created admin user: ${adminUser.email} (Password: adminpassword123)`);
  
  // 2. Seed Products
  const products = [
    {
      name: 'TRI Fusion Pack (Try Pack)',
      price: 599,
      sku: 'TRI-FUSION-01',
      description: 'Protein + BCAA + Pre-Workout — 9 Sachets. Experience the complete 3-day performance protocol before committing to larger sizes.',
      imageUrl: 'assets/tri_fusion_pack_ad.webp',
      stock: 1000
    }
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });
    console.log(`Created product with id: ${product.id} (SKU: ${product.sku})`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
