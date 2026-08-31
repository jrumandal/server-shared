// Idempotent development seed for the shared PostgreSQL database.
//
// Run via `pnpm db:seed` (Prisma reads the `prisma.seed` config in package.json).
// Safe to run repeatedly: every write is an upsert keyed on a natural unique
// field (slug / sku / email / composite keys), so re-running is a no-op.
//
// Uses the default Prisma client output (`@prisma/client`), so it works from
// any project in the monorepo without a custom `output` path.

import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Deterministic password hash (no real auth in this reference — Phase 4 adds it). */
function hashPassword(plain) {
  return createHash('sha256').update(plain).digest('hex');
}

/** Upsert a category by slug. */
async function upsertCategory(slug, name, parentId = null) {
  return prisma.category.upsert({
    where: { slug },
    update: { name, parentId },
    create: { slug, name, parentId },
  });
}

/** Upsert a product by sku, then attach its categories + attributes. */
async function upsertProduct({
  sku,
  name,
  description,
  priceCents,
  imageUrl,
  inStock = true,
  categorySlugs = [],
  attributes = [],
}) {
  const product = await prisma.product.upsert({
    where: { sku },
    update: {
      name,
      description,
      price: priceCents,
      currency: 'USD',
      imageUrl,
      inStock,
    },
    create: {
      sku,
      name,
      description,
      price: priceCents,
      currency: 'USD',
      imageUrl,
      inStock,
    },
  });

  // Reconcile categories (many-to-many via ProductCategory join table).
  const wanted = [];
  for (const slug of categorySlugs) {
    const category = await prisma.category.findUniqueOrThrow({ where: { slug } });
    wanted.push(category.id);
    await prisma.productCategory.upsert({
      where: {
        productId_categoryId: { productId: product.id, categoryId: category.id },
      },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });
  }
  // Remove any category links no longer wanted.
  const current = await prisma.productCategory.findMany({
    where: { productId: product.id },
    select: { categoryId: true },
  });
  const stale = current
    .map((row) => row.categoryId)
    .filter((id) => !wanted.includes(id));
  if (stale.length) {
    await prisma.productCategory.deleteMany({
      where: { productId: product.id, categoryId: { in: stale } },
    });
  }

  // Reconcile attributes (unique per product+name).
  for (const { name: attrName, value } of attributes) {
    await prisma.productAttribute.upsert({
      where: { productId_name: { productId: product.id, name: attrName } },
      update: { value },
      create: { productId: product.id, name: attrName, value },
    });
  }

  return product;
}

async function main() {
  console.log('Seeding database…');

  // --- Catalog -----------------------------------------------------------
  const electronics = await upsertCategory('electronics', 'Electronics');
  await upsertCategory('audio', 'Audio', electronics.id);
  await upsertCategory('accessories', 'Accessories', electronics.id);

  await upsertProduct({
    sku: 'headphones-x100',
    name: 'Aurora X100 Headphones',
    description: 'Over-ear wireless headphones with active noise cancellation.',
    priceCents: 24999,
    imageUrl: 'https://picsum.photos/seed/aurora-x100/600/450',
    inStock: true,
    categorySlugs: ['audio'],
    attributes: [
      { name: 'driver', value: '40mm' },
      { name: 'battery', value: '30h' },
    ],
  });

  await upsertProduct({
    sku: 'speaker-mini',
    name: 'Pulse Mini Speaker',
    description: 'Portable Bluetooth speaker with 360° sound.',
    priceCents: 7999,
    imageUrl: 'https://picsum.photos/seed/pulse-mini/600/450',
    inStock: true,
    categorySlugs: ['audio', 'accessories'],
    attributes: [{ name: 'battery', value: '12h' }],
  });

  await upsertProduct({
    sku: 'keyboard-k87',
    name: 'Keystroke K87 Keyboard',
    description: 'Low-profile mechanical keyboard with hot-swappable switches.',
    priceCents: 12999,
    imageUrl: 'https://picsum.photos/seed/keystroke-k87/600/450',
    inStock: false,
    categorySlugs: ['electronics'],
    attributes: [
      { name: 'layout', value: 'ANSI' },
      { name: 'switches', value: 'linear' },
    ],
  });

  await upsertProduct({
    sku: 'mouse-m2',
    name: 'Glide M2 Mouse',
    description: 'Ergonomic wireless mouse, 8 programmable buttons.',
    priceCents: 5999,
    imageUrl: 'https://picsum.photos/seed/glide-m2/600/450',
    inStock: true,
    categorySlugs: ['accessories'],
    attributes: [{ name: 'dpi', value: '4000' }],
  });

  // --- User --------------------------------------------------------------
  const email = 'demo@example.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Demo User',
      passwordHash: hashPassword('password123'),
      line1: '1 Reference St',
      city: 'Exampleville',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
    },
    create: {
      email,
      name: 'Demo User',
      passwordHash: hashPassword('password123'),
      line1: '1 Reference St',
      city: 'Exampleville',
      state: 'CA',
      postalCode: '90210',
      country: 'US',
    },
  });

  // One active session with a deterministic token (idempotent).
  const sessionToken = `seed-session-${email}`;
  await prisma.session.upsert({
    where: { token: sessionToken },
    update: {
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
    create: {
      userId: user.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  });

  // --- Cart --------------------------------------------------------------
  const cart =
    (await prisma.cart.findFirst({ where: { userId: user.id } })) ??
    (await prisma.cart.create({ data: { userId: user.id } }));

  async function addCartItem(sku, quantity) {
    const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
    const item = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId: product.id } },
    });
    if (item) {
      return prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity, unitPrice: product.price, currency: product.currency },
      });
    }
    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity,
        unitPrice: product.price,
        currency: product.currency,
      },
    });
  }

  await addCartItem('headphones-x100', 1);
  await addCartItem('mouse-m2', 2);

  // --- Order -------------------------------------------------------------
  const order =
    (await prisma.order.findFirst({ where: { userId: user.id } })) ??
    (await prisma.order.create({
      data: { userId: user.id, status: 'PLACED', total: 0, currency: 'USD' },
    }));

  async function addOrderItem(sku, quantity) {
    const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
    const item = await prisma.orderItem.findUnique({
      where: { orderId_productId: { orderId: order.id, productId: product.id } },
    });
    if (item) {
      return prisma.orderItem.update({
        where: { id: item.id },
        data: { quantity, unitPrice: product.price, currency: product.currency },
      });
    }
    return prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        quantity,
        unitPrice: product.price,
        currency: product.currency,
      },
    });
  }

  await addOrderItem('speaker-mini', 1);
  await addOrderItem('keyboard-k87', 1);

  // Recompute order total from its items.
  const orderItems = await prisma.orderItem.findMany({ where: { orderId: order.id } });
  const total = orderItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  await prisma.order.update({
    where: { id: order.id },
    data: { total, currency: 'USD' },
  });

  // --- Summary -----------------------------------------------------------
  const [products, categories, carts, orders] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.cart.count(),
    prisma.order.count(),
  ]);
  console.log(
    `Seeded: ${products} products, ${categories} categories, ${carts} carts, ${orders} orders (user: ${email}).`,
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
