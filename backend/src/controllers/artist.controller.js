const prisma = require('../config/prisma');

// GET /api/artist/dashboard
async function dashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const [user, tracksCount, approvedCount, totalEarned, lastEarnings] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.track.count({ where: { ownerId: userId } }),
      prisma.track.count({ where: { ownerId: userId, status: 'APPROVED' } }),
      prisma.earning.aggregate({ where: { userId }, _sum: { amount: true } }),
      prisma.earning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { track: { select: { id: true, title: true } } },
      }),
    ]);
    res.json({
      balance: user.balance,
      labelShare: user.labelShare,
      tracksCount,
      approvedCount,
      totalEarned: totalEarned._sum.amount || 0,
      lastEarnings,
    });
  } catch (e) { next(e); }
}

// GET /api/artist/tracks  — треки, где артист владелец
async function myTracks(req, res, next) {
  try {
    const tracks = await prisma.track.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    res.json({ tracks });
  } catch (e) { next(e); }
}

// GET /api/artist/invites  — треки, куда меня позвали на фит и я ещё не ответил/в споре
async function myInvites(req, res, next) {
  try {
    const splits = await prisma.split.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['PENDING', 'DISPUTED'] },
        track: { ownerId: { not: req.user.id } },
      },
      include: {
        track: {
          include: {
            owner: { select: { id: true, name: true, email: true } },
            splits: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ invites: splits });
  } catch (e) { next(e); }
}

// GET /api/artist/wallet
async function wallet(req, res, next) {
  try {
    const userId = req.user.id;
    const [user, earnings, payouts] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.earning.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { track: { select: { id: true, title: true } } },
      }),
      prisma.payout.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({ balance: user.balance, earnings, payouts });
  } catch (e) { next(e); }
}

// POST /api/artist/wallet/withdraw  { amount }
async function requestWithdraw(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (amount > user.balance) return res.status(400).json({ error: 'Insufficient balance' });

    const payout = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });
      return tx.payout.create({
        data: { userId: user.id, amount, status: 'REQUESTED' },
      });
    });
    res.status(201).json({ payout });
  } catch (e) { next(e); }
}

module.exports = { dashboard, myTracks, myInvites, wallet, requestWithdraw };
