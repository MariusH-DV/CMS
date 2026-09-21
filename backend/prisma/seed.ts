import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findFirst({ where: { isSystemAdmin: true } });
  if (existing) {
    console.log(`System-Admin existiert bereits (${existing.email}) - ueberspringe Seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isSystemAdmin: true,
    },
  });

  console.log(`System-Admin angelegt: ${admin.email} (Passwort wie in .env definiert)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
