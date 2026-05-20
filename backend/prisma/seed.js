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
  const masha = await prisma.user.upsert({
    where: { email: 'masha@label.local' },
    update: {},
    create: {
      email: 'masha@label.local',
      password: artistPass,
      name: 'Masha Wave',
      role: 'ARTIST',
      labelShare: 25,
    },
  });

  const nikita = await prisma.user.upsert({
    where: { email: 'nikita@label.local' },
    update: {},
    create: {
      email: 'nikita@label.local',
      password: artistPass,
      name: 'Nikita Flow',
      role: 'ARTIST',
      labelShare: 28,
    },
  });

  const anna = await prisma.user.upsert({
    where: { email: 'anna@label.local' },
    update: {},
    create: {
      email: 'anna@label.local',
      password: artistPass,
      name: 'Anna Synth',
      role: 'ARTIST',
      labelShare: 22,
    },
  });

  console.log('Seeded users:', {
    admin: admin.email,
    vasya: vasya.email,
    petya: petya.email,
    masha: masha.email,
    nikita: nikita.email,
    anna: anna.email,
  });
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
  await seedTrack({
    ownerId: masha.id,
    title: 'Neon Rain',
    labelShare: masha.labelShare,
    releaseDate: new Date('2025-05-20'),
    splits: [{ userId: masha.id, share: 100 }],
  });
  await seedTrack({
    ownerId: nikita.id,
    title: 'City Lights',
    labelShare: nikita.labelShare,
    releaseDate: new Date('2025-06-05'),
    splits: [
      { userId: nikita.id, share: 70 },
      { userId: anna.id, share: 30 },
    ],
  });
  await seedTrack({
    ownerId: anna.id,
    title: 'Velvet Bass',
    labelShare: anna.labelShare,
    releaseDate: new Date('2025-06-18'),
    splits: [
      { userId: anna.id, share: 65 },
      { userId: masha.id, share: 35 },
    ],
  });
  await seedTrack({
    ownerId: vasya.id,
    title: 'Northern Echo',
    labelShare: vasya.labelShare,
    releaseDate: new Date('2025-07-07'),
    splits: [
      { userId: vasya.id, share: 50 },
      { userId: nikita.id, share: 25 },
      { userId: petya.id, share: 25 },
    ],
  });

  console.log('Seeded demo tracks with ACCEPTED splits.');
  await seedDemoEarnings();
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

async function seedDemoEarnings() {
  const filename = 'demo-rich-analytics-seed';
  const existing = await prisma.report.findFirst({ where: { filename } });
  if (existing) {
    console.log('Demo earnings already seeded.');
    return;
  }

  const rows = [
    ['Summer Vibes', 'vasya@label.local', 12600, '2025-03'],
    ['Midnight Drive (feat. Petya)', 'vasya@label.local', 18400, '2025-03'],
    ['Lofi Dream', 'petya@label.local', 9400, '2025-03'],
    ['Summer Vibes', 'vasya@label.local', 15800, '2025-04'],
    ['Midnight Drive (feat. Petya)', 'vasya@label.local', 22400, '2025-04'],
    ['Lofi Dream', 'petya@label.local', 12100, '2025-04'],
    ['Neon Rain', 'masha@label.local', 17600, '2025-05'],
    ['City Lights', 'nikita@label.local', 14900, '2025-05'],
    ['Velvet Bass', 'anna@label.local', 13200, '2025-05'],
    ['Summer Vibes', 'vasya@label.local', 16800, '2025-05'],
    ['Neon Rain', 'masha@label.local', 24100, '2025-06'],
    ['City Lights', 'nikita@label.local', 21800, '2025-06'],
    ['Velvet Bass', 'anna@label.local', 19600, '2025-06'],
    ['Northern Echo', 'vasya@label.local', 15100, '2025-06'],
    ['Neon Rain', 'masha@label.local', 28200, '2025-07'],
    ['City Lights', 'nikita@label.local', 26300, '2025-07'],
    ['Velvet Bass', 'anna@label.local', 21700, '2025-07'],
    ['Northern Echo', 'vasya@label.local', 24400, '2025-07'],
    ['Midnight Drive (feat. Petya)', 'vasya@label.local', 19700, '2025-07'],
    ['Neon Rain', 'masha@label.local', 31600, '2025-08'],
    ['City Lights', 'nikita@label.local', 28900, '2025-08'],
    ['Velvet Bass', 'anna@label.local', 23800, '2025-08'],
    ['Northern Echo', 'vasya@label.local', 27500, '2025-08'],
    ['Lofi Dream', 'petya@label.local', 14300, '2025-08'],
  ];

  const report = await prisma.report.create({
    data: {
      filename,
      rowsCount: rows.length,
      totalAmount: rows.reduce((sum, [, , amount]) => sum + amount, 0),
    },
  });

  for (const [trackTitle, artistEmail, amount, period] of rows) {
    const owner = await prisma.user.findUnique({ where: { email: artistEmail } });
    const track = await prisma.track.findFirst({
      where: { title: trackTitle, ownerId: owner.id },
      include: { splits: true },
    });
    if (!track) throw new Error(`Demo track not found: ${trackTitle}`);

    const artistsPool = amount - amount * (track.labelShare / 100);
    for (const split of track.splits.filter((item) => item.status === 'ACCEPTED')) {
      const share = artistsPool * (split.share / 100);
      await prisma.earning.create({
        data: {
          trackId: track.id,
          userId: split.userId,
          amount: share,
          period,
          reportId: report.id,
        },
      });
      await prisma.user.update({
        where: { id: split.userId },
        data: { balance: { increment: share } },
      });
    }
  }

  console.log('Seeded rich demo earnings.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
