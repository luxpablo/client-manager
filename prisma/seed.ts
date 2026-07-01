import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.service.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.server.deleteMany();
  await prisma.providerRecord.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.user.deleteMany();
  await prisma.systemSettings.deleteMany();

  await prisma.user.create({
    data: { id: 'user-admin', username: 'admin', password: 'admin123', name: 'Admin', role: 'Admin', createdAt: new Date() },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
