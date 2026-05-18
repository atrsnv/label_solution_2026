const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const artistPass = await bcrypt.hash('artist123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@label.local' },
    update: {},
    create: {
      email: 'admin@label.local',
      password: adminPass,
      name: 'Label Admin',
      role: 'ADMIN',
    },
  });

  const vasya = await prisma.user.upsert({
    where: { email: 'vasya@label.local' },
    update: {},
    create: {
      email: 'vasya@label.local',
      password: artistPass,
      name: 'Vasya MC',
      role: 'ARTIST',
      labelShare: 30,
    },
  });

  const petya = await prisma.user.upsert({
    where: { email: 'petya@label.local' },
    update: {},
    create: {
      email: 'petya@label.local',
      password: artistPass,
      name: 'Petya Beats',
      role: 'ARTIST',
      labelShare: 30,
    },
  });

  console.log('Seeded users:', { admin: admin.email, vasya: vasya.email, petya: petya.email });
  console.log('Default passwords -> admin: admin123, artists: artist123');

  // Демонстрационные треки + сплиты (только если их ещё нет)
  await seedTrack({
    ownerId: vasya.id,
    title: 'Summer Vibes',
    labelShare: vasya.labelShare,
    releaseDate: new Date('2025-03-15'),
    splits: [{ userId: vasya.id, share: 100 }],
  });
  await seedTrack({
    ownerId: vasya.id,
    title: 'Midnight Drive (feat. Petya)',
    labelShare: vasya.labelShare,
    releaseDate: new Date('2025-04-01'),
    splits: [
      { userId: vasya.id, share: 60 },
      { userId: petya.id, share: 40 },
    ],
  });
  await seedTrack({
    ownerId: petya.id,
    title: 'Lofi Dream',
    labelShare: petya.labelShare,
    releaseDate: new Date('2025-04-12'),
    splits: [{ userId: petya.id, share: 100 }],
  });

  console.log('Seeded demo tracks with ACCEPTED splits.');
}

async function seedTrack({ ownerId, title, labelShare, releaseDate, splits }) {
  const existing = await prisma.track.findFirst({ where: { ownerId, title } });
  if (existing) return existing;
  return prisma.track.create({
    data: {
      ownerId,
      title,
      labelShare,
      releaseDate,
      status: 'APPROVED',
      splits: {
        create: splits.map((s) => ({
          userId: s.userId,
          share: s.share,
          status: 'ACCEPTED',
        })),
      },
    },
  });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
