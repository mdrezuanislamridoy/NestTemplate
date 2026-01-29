import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from './generated/prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config'; 
import { NotFoundException } from '@nestjs/common';

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('❌ DATABASE_URL must be set in environment variables.');
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: [{ emit: 'event', level: 'error' }],
  });
}

const prisma = createPrismaClient();

async function seedSuperAdmin() {
  const {
    SUPER_ADMIN_FIRSTNAME,
    SUPER_ADMIN_LASTNAME,
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD,
  } = process.env;

  if (
    !SUPER_ADMIN_FIRSTNAME ||
    !SUPER_ADMIN_LASTNAME ||
    !SUPER_ADMIN_EMAIL ||
    !SUPER_ADMIN_PASSWORD
  ) {
    throw new NotFoundException('❌ SUPER_ADMIN_* environment variables must be set.');
  }

  const existing = await prisma.user.findFirst({
    where: { email: SUPER_ADMIN_EMAIL },
  });

  if (existing) {
    console.log('⚠️ Super Admin already exists. Skipping...');
    return;
  }

  const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
       email: SUPER_ADMIN_EMAIL,
       password: hashedPassword,
       name: `${SUPER_ADMIN_FIRSTNAME} ${SUPER_ADMIN_LASTNAME}`,
       role: UserRole.SUPER_ADMIN, 
    },
  });

  console.log('✅ Super Admin created successfully');
}

 
 

 

async function main() {
  console.log('🚀 Seeding started...');

  await seedSuperAdmin();
  console.log('🎉 Seeding completed successfully');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
