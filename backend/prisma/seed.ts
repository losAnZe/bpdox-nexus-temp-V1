import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

// --- Explicit Type Definitions ---
interface ApiCurrency {
  name: string;
  currency: string;
  iso2: string;
  iso3: string;
}

interface ApiState {
  name: string;
  iso3: string;
  iso2: string;
  states: { name: string; state_code: string }[];
}

interface ApiResponse<T> {
  error: boolean;
  msg: string;
  data: T;
}

async function main() {
  console.log('🌱 Starting InvoiceCore Database Seeding...');

  // ==================================================
  // 1. SEED INDIAN STATES (GST CRITICAL - STATIC IDS)
  // ==================================================
  const indianStates = [
    { code: 1, name: "Jammu & Kashmir" },
    { code: 2, name: "Himachal Pradesh" },
    { code: 3, name: "Punjab" },
    { code: 4, name: "Chandigarh" },
    { code: 5, name: "Uttarakhand" },
    { code: 6, name: "Haryana" },
    { code: 7, name: "Delhi" },
    { code: 8, name: "Rajasthan" },
    { code: 9, name: "Uttar Pradesh" },
    { code: 10, name: "Bihar" },
    { code: 11, name: "Sikkim" },
    { code: 12, name: "Arunachal Pradesh" },
    { code: 13, name: "Nagaland" },
    { code: 14, name: "Manipur" },
    { code: 15, name: "Mizoram" },
    { code: 16, name: "Tripura" },
    { code: 17, name: "Meghalaya" },
    { code: 18, name: "Assam" },
    { code: 19, name: "West Bengal" },
    { code: 20, name: "Jharkhand" },
    { code: 21, name: "Odisha" },
    { code: 22, name: "Chhattisgarh" },
    { code: 23, name: "Madhya Pradesh" },
    { code: 24, name: "Gujarat" },
    { code: 25, name: "Daman & Diu" },
    { code: 26, name: "Dadra & Nagar Haveli" },
    { code: 27, name: "Maharashtra" },
    { code: 29, name: "Karnataka" },
    { code: 30, name: "Goa" },
    { code: 31, name: "Lakshadweep" },
    { code: 32, name: "Kerala" },
    { code: 33, name: "Tamil Nadu" },
    { code: 34, name: "Puducherry" },
    { code: 35, name: "Andaman & Nicobar Islands" },
    { code: 36, name: "Telangana" },
    { code: 37, name: "Andhra Pradesh" },
    { code: 38, name: "Ladakh" },
    { code: 97, name: "Other Territory" },
    { code: 99, name: "International / Export" }
  ];

  console.log(`... Syncing ${indianStates.length} Indian GST States`);
  for (const s of indianStates) {
    await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name, country: "India" },
      create: { code: s.code, name: s.name, country: "India" }
    });
  }

  // ==================================================
  // 2. FETCH & SEED COUNTRIES + GLOBAL STATES (Optimized for Sandbox)
  // ==================================================
  console.log('... Seeding default countries (India, US, UK, UAE)');
  try {
    const defaultCountries = [
      { iso_code: "IN", name: "India", currency: "INR" },
      { iso_code: "US", name: "United States", currency: "USD" },
      { iso_code: "GB", name: "United Kingdom", currency: "GBP" },
      { iso_code: "AE", name: "United Arab Emirates", currency: "AED" }
    ];
    for (const c of defaultCountries) {
      await prisma.country.upsert({
        where: { iso_code: c.iso_code },
        update: { name: c.name, currency: c.currency },
        create: { iso_code: c.iso_code, name: c.name, currency: c.currency, phone_code: "" }
      });
    }
    console.log("✅ Global Data Seeded Successfully");
  } catch (error) {
    console.error("❌ Seeding default countries failed:", error);
  }

  console.log('✅ Seeding Process Complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
