const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const users = [
  { email: 'admin@label.local', password: 'admin123', name: 'Label Admin', role: 'ADMIN' },
  { email: 'sodaluv@label.local', password: 'artist123', name: 'SODA LUV', role: 'ARTIST' },
  { email: 'instasamka@label.local', password: 'artist123', name: 'Instasamka', role: 'ARTIST' },
  { email: 'morgenshtern@label.local', password: 'artist123', name: 'Morgenshtern', role: 'ARTIST' },
  { email: 'masha@label.local', password: 'artist123', name: 'Masha Wave', role: 'ARTIST' },
  { email: 'nikita@label.local', password: 'artist123', name: 'Nikita Flow', role: 'ARTIST' },
  { email: 'anna@label.local', password: 'artist123', name: 'Anna Synth', role: 'ARTIST' },
];

async function main() {
  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
      },
      create: {
        email: user.email,
        password,
        name: user.name,
        role: user.role,
      },
    });
  }

  console.log('Seeded auth users only. Business data comes from DataLens.');
  console.log('Default passwords -> admin: admin123, artists: artist123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
