const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const config = require('../config');
const { parseArtistIdMap } = require('../utils/datalens');
const {
  buildArtistDatalensTrackRegistry,
  buildArtistDatalensDashboard,
  parseDatalensCsv,
} = require('../utils/datalensDashboard');

function loadDatalensRows() {
  const datasetPath = path.resolve(
    __dirname,
    '../../sample-data/label_financial_analytics_rich.csv',
  );
  const content = fs.readFileSync(datasetPath, 'utf8');

  return parseDatalensCsv(content);
}

// GET /api/artist/dashboard
async function dashboard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const datalens = buildArtistDatalensDashboard(
      loadDatalensRows(),
      user,
      parseArtistIdMap(config.datalens.artistIdMap),
    );

    res.json({
      balance: datalens.summary.balance,
      labelShare: user.labelShare,
      tracksCount: datalens.summary.tracksCount,
      approvedCount: datalens.summary.approvedTracksCount,
      totalEarned: datalens.summary.totalEarned,
      totalStreams: datalens.summary.totalStreams,
      datalensArtist: datalens.datalensArtist,
      lastEarnings: datalens.lastEarnings,
    });
  } catch (e) { next(e); }
}

// GET /api/artist/analytics — JSON-витрина для личного кабинета артиста
async function analytics(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const datalens = buildArtistDatalensDashboard(
      loadDatalensRows(),
      user,
      parseArtistIdMap(config.datalens.artistIdMap),
    );

    res.json(datalens);
  } catch (e) { next(e); }
}

// GET /api/artist/tracks  — треки, где артист владелец
async function myTracks(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const localTracks = await prisma.track.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    res.json({
      tracks: buildArtistDatalensTrackRegistry(
        loadDatalensRows(),
        user,
        parseArtistIdMap(config.datalens.artistIdMap),
        localTracks,
      ),
    });
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

module.exports = { dashboard, analytics, myTracks, myInvites, wallet, requestWithdraw };
