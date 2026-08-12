import { PrismaClient } from '@prisma/client';

async function seedBank() {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.bankAccount.findFirst();
    if (existing) {
      console.log('ℹ️ A bank account already exists:', existing.label);
      return;
    }

    const testBank = await prisma.bankAccount.create({
      data: {
        label: 'Primary HDFC Business Account',
        currency: 'INR',
        bank_name: 'HDFC Bank Ltd',
        account_holder: 'BPDoxS Technologies Pvt Ltd',
        account_number: '50200012345678',
        routing_number: null,
        swift_code: 'HDFCCINBBXXX',
        ifsc_code: 'HDFC0001234',
        iban: null,
        sort_code: null,
        branch_address: 'Main Branch, Connaught Place, New Delhi - 110001',
        upi_id: 'bpdoxs@hdfc',
        payment_method: 'NEFT/IMPS/UPI',
        is_default: true
      }
    });

    console.log('✅ Success: Created bank account:', testBank.label);
  } catch (error) {
    console.error('❌ Error creating bank account:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBank();
