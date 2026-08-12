import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const prisma = new PrismaClient();
  
  try {
    const hash = await bcrypt.hash('admin123', 10);
    
    await prisma.user.create({
      data: {
        email: 'admin@bpdoxs.com',
        password_hash: hash,
        role: 'SUDO_ADMIN'
      }
    });

    await prisma.systemSetting.createMany({
      data: [
        { key: 'SOFTWARE_NAME', value: 'BPDoxS', is_locked: true },
        { key: 'SMTP_CONFIG', json_value: {} }
      ]
    });

    console.log('✅ Admin user created: admin@bpdoxs.com / admin123');
    console.log('✅ System settings initialized.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
