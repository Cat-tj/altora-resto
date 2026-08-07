/**
 * Seed script for Altora Resto — creates demo data for local development.
 *
 * Usage:
 *   npx prisma db seed  (from project root, uses DATABASE_URL from .env)
 *   or: pnpm prisma db seed
 *
 * Creates:
 *   - 1 Tenant (demo restaurant)
 *   - 1 Outlet (main branch)
 *   - 1 Admin user (Pengguna + KeanggotaanTenant)
 *   - 4 Menu categories
 *   - 10 Sample menu items with variants
 *   - Modifier groups + options (toppings, spice level)
 *   - Pricing per outlet (HargaItemOutlet)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Deterministic IDs for reproducibility
function id(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(3, "0")}`;
}

async function main() {
  console.log("🌱 Seeding Altora Resto demo data...\n");

  // ─── 1. Tenant ────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-resto" },
    update: {},
    create: {
      id: id("tenant", 1),
      nama: "Warung Nusantara",
      slug: "demo-resto",
      status: "AKTIF",
    },
  });
  console.log(`  ✅ Tenant: ${tenant.nama} (${tenant.id})`);

  // ─── 2. Outlet ────────────────────────────────────────────────────────
  const outlet = await prisma.outlet.upsert({
    where: { tenantId_id: { tenantId: tenant.id, id: id("outlet", 1) } },
    update: {},
    create: {
      id: id("outlet", 1),
      tenantId: tenant.id,
      nama: "Cabang Utama",
      kode: "CU-01",
      zonaWaktu: "Asia/Jakarta",
      status: "AKTIF",
    },
  });
  console.log(`  ✅ Outlet: ${outlet.nama} (${outlet.kode})`);

  // ─── 3. Admin User ────────────────────────────────────────────────────
  const admin = await prisma.pengguna.upsert({
    where: { email: "admin@demo-resto.com" },
    update: {},
    create: {
      id: id("pengguna", 1),
      namaLengkap: "Admin Utama",
      email: "admin@demo-resto.com",
      status: "AKTIF",
      emailTerverifikasiPada: new Date(),
    },
  });
  console.log(`  ✅ Admin: ${admin.namaLengkap} (${admin.email})`);

  // ─── 4. Keanggotaan Tenant (admin → tenant) ──────────────────────────
  const keanggotaan = await prisma.keanggotaanTenant.upsert({
    where: {
      penggunaId_tenantId: {
        penggunaId: admin.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      id: id("kt", 1),
      penggunaId: admin.id,
      tenantId: tenant.id,
      status: "AKTIF",
      isOwner: true,
    },
  });
  console.log(`  ✅ Keanggotaan Tenant: owner`);

  // ─── 5. Keanggotaan Outlet (admin → outlet) ──────────────────────────
  await prisma.keanggotaanOutlet.upsert({
    where: {
      keanggotaanTenantId_outletId: {
        keanggotaanTenantId: keanggotaan.id,
        outletId: outlet.id,
      },
    },
    update: {},
    create: {
      id: id("ko", 1),
      keanggotaanTenantId: keanggotaan.id,
      outletId: outlet.id,
      tenantId: tenant.id,
      status: "AKTIF",
    },
  });
  console.log(`  ✅ Keanggotaan Outlet: admin → Cabang Utama`);

  // ─── 6. Modifier Groups & Options ────────────────────────────────────
  const modToping = await prisma.modifierGrup.upsert({
    where: { id: id("mg", 1) },
    update: {},
    create: {
      id: id("mg", 1),
      tenantId: tenant.id,
      nama: "Toping Tambahan",
      wajibPilih: false,
      minPilihan: 0,
      maxPilihan: 3,
    },
  });

  const modPedas = await prisma.modifierGrup.upsert({
    where: { id: id("mg", 2) },
    update: {},
    create: {
      id: id("mg", 2),
      tenantId: tenant.id,
      nama: "Tingkat Pedas",
      wajibPilih: true,
      minPilihan: 1,
      maxPilihan: 1,
    },
  });

  const topingOptions = [
    { nama: "Keju", harga: 5000 },
    { nama: "Sosis", harga: 4000 },
    { nama: "Telur", harga: 3000 },
  ];
  for (const [i, opt] of topingOptions.entries()) {
    await prisma.modifierOpsi.upsert({
      where: { id: id("mo", i + 1) },
      update: {},
      create: {
        id: id("mo", i + 1),
        modifierGrupId: modToping.id,
        nama: opt.nama,
        hargaTambahan: BigInt(opt.harga),
        status: "AKTIF",
      },
    });
  }

  const pedasOptions = [
    { nama: "Tidak Pedas", harga: 0 },
    { nama: "Sedang", harga: 0 },
    { nama: "Pedas", harga: 0 },
    { nama: "Extra Pedas", harga: 2000 },
  ];
  for (const [i, opt] of pedasOptions.entries()) {
    await prisma.modifierOpsi.upsert({
      where: { id: id("mo", i + 4) },
      update: {},
      create: {
        id: id("mo", i + 4),
        modifierGrupId: modPedas.id,
        nama: opt.nama,
        hargaTambahan: BigInt(opt.harga),
        status: "AKTIF",
      },
    });
  }
  console.log(`  ✅ Modifier Groups: ${modToping.nama}, ${modPedas.nama}`);

  // ─── 7. Menu Categories ──────────────────────────────────────────────
  const categories = [
    { nama: "Nasi & Mie", urutan: 1 },
    { nama: "Ayam & Bebek", urutan: 2 },
    { nama: "Minuman", urutan: 3 },
    { nama: "Snack & Cemilan", urutan: 4 },
  ];

  const kategoris: Record<string, string> = {};
  for (const [i, cat] of categories.entries()) {
    const k = await prisma.kategoriMenu.upsert({
      where: { tenantId_id: { tenantId: tenant.id, id: id("km", i + 1) } },
      update: {},
      create: {
        id: id("km", i + 1),
        tenantId: tenant.id,
        nama: cat.nama,
        urutan: cat.urutan,
        status: "AKTIF",
      },
    });
    kategoris[cat.nama] = k.id;
  }
  console.log(`  ✅ Categories: ${categories.map((c) => c.nama).join(", ")}`);

  // ─── 8. Menu Items with Variants + Pricing ──────────────────────────
  interface MenuItemDef {
    nama: string;
    deskripsi: string;
    kategori: string;
    harga: number;
    variants?: { nama: string; tambahan: number }[];
    modifierIds?: string[];
  }

  const menuItems: MenuItemDef[] = [
    {
      nama: "Nasi Goreng Spesial",
      deskripsi: "Nasi goreng dengan telur, ayam, dan sayuran segar",
      kategori: "Nasi & Mie",
      harga: 35000,
      variants: [
        { nama: "Porsi Biasa", tambahan: 0 },
        { nama: "Porsi Jumbo", tambahan: 15000 },
      ],
      modifierIds: [modPedas.id],
    },
    {
      nama: "Mie Ayam Bakso",
      deskripsi: "Mie kuning dengan ayam cincang dan bakso",
      kategori: "Nasi & Mie",
      harga: 30000,
      variants: [
        { nama: "Biasa", tambahan: 0 },
        { nama: "Spesial (2 Bakso)", tambahan: 8000 },
      ],
      modifierIds: [modPedas.id],
    },
    {
      nama: "Ayam Goreng Lengkuas",
      deskripsi: "Ayam goreng renyah dengan bumbu lengkuas",
      kategori: "Ayam & Bebek",
      harga: 38000,
      variants: [
        { nama: "Paha Atas", tambahan: 0 },
        { nama: "Paha Bawah", tambahan: 0 },
        { nama: "Dada", tambahan: -2000 },
      ],
      modifierIds: [modToping.id, modPedas.id],
    },
    {
      nama: "Ayam Bakar Madu",
      deskripsi: "Ayam bakar bumbu madu yang caramelized",
      kategori: "Ayam & Bebek",
      harga: 42000,
      variants: [
        { nama: "Setengah Ekor", tambahan: 0 },
        { nama: "Sekali Ekor", tambahan: 25000 },
      ],
    },
    {
      nama: "Bebek Goreng Sambal Ijo",
      deskripsi: "Bebek goreng krispi dengan sambal ijo",
      kategori: "Ayam & Bebek",
      harga: 45000,
    },
    {
      nama: "Es Teh Manis",
      deskripsi: "Teh manis es segar",
      kategori: "Minuman",
      harga: 8000,
      variants: [
        { nama: "Gelas", tambahan: 0 },
        { nama: "Mug", tambahan: 5000 },
      ],
    },
    {
      nama: "Es Jeruk Segar",
      deskripsi: "Jeruk peras segar dengan es batu",
      kategori: "Minuman",
      harga: 12000,
      variants: [
        { nama: "Gelas", tambahan: 0 },
        { nama: "Mug", tambahan: 5000 },
      ],
    },
    {
      nama: "Kopi Susu Gula Aren",
      deskripsi: "Kopi robusta dengan susu segar dan gula aren",
      kategori: "Minuman",
      harga: 22000,
    },
    {
      nama: "Kentang Goreng",
      deskripsi: "Kentang goreng renyah dengan saus",
      kategori: "Snack & Cemilan",
      harga: 18000,
      variants: [
        { nama: "Kecil", tambahan: 0 },
        { nama: "Besar", tambahan: 8000 },
      ],
      modifierIds: [modToping.id],
    },
    {
      nama: "Pisang Goreng",
      deskripsi: "Pisang goreng tepung dengan madu",
      kategori: "Snack & Cemilan",
      harga: 15000,
    },
  ];

  for (const [i, menuItem] of menuItems.entries()) {
    const itemId = id("im", i + 1);
    const created = await prisma.itemMenu.upsert({
      where: { tenantId_id: { tenantId: tenant.id, id: itemId } },
      update: {},
      create: {
        id: itemId,
        tenantId: tenant.id,
        kategoriId: kategoris[menuItem.kategori],
        nama: menuItem.nama,
        deskripsi: menuItem.deskripsi,
        stokTakTerbatas: true,
        status: "AKTIF",
      },
    });

    // Create variants
    if (menuItem.variants) {
      for (const [j, v] of menuItem.variants.entries()) {
        await prisma.varianMenu.upsert({
          where: { id: id("vm", i * 10 + j + 1) },
          update: {},
          create: {
            id: id("vm", i * 10 + j + 1),
            itemMenuId: created.id,
            nama: v.nama,
            hargaTambahan: BigInt(v.tambahan),
            status: "AKTIF",
          },
        });
      }
    }

    // Create pricing per outlet (HargaItemOutlet — no composite unique, use id)
    await prisma.hargaItemOutlet.upsert({
      where: { id: id("ho", i + 1) },
      update: {},
      create: {
        id: id("ho", i + 1),
        tenantId: tenant.id,
        itemMenuId: created.id,
        outletId: outlet.id,
        harga: BigInt(menuItem.harga),
      },
    });

    // Link modifier groups to item
    if (menuItem.modifierIds) {
      for (const [j, mgId] of menuItem.modifierIds.entries()) {
        await prisma.itemModifierGrup.upsert({
          where: {
            itemMenuId_modifierGrupId: {
              itemMenuId: created.id,
              modifierGrupId: mgId,
            },
          },
          update: {},
          create: {
            id: id("img", i * 10 + j + 1),
            itemMenuId: created.id,
            modifierGrupId: mgId,
            urutan: j,
          },
        });
      }
    }

    console.log(`  ✅ Item: ${created.nama} — Rp ${menuItem.harga.toLocaleString("id-ID")}`);
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log(`\n📋 Demo credentials:`);
  console.log(`   Email:    admin@demo-resto.com`);
  console.log(`   Tenant:   Warung Nusantara (${tenant.slug})`);
  console.log(`   Outlet:   Cabang Utama (${outlet.kode})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
