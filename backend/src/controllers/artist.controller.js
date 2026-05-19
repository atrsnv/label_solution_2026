const prisma = require('../config/prisma');
const config = require('../config');
const { parseArtistIdMap } = require('../utils/datalens');
const {
  buildArtistDatalensTrackRegistry,
  buildArtistDatalensDashboard,
} = require('../utils/datalensDashboard');
const { applyPayoutsToArtistDashboard } = require('../utils/artistBalance');
const { loadDatalensRows } = require('../services/datalensSource.service');

async function buildCurrentArtistDashboard(user) {
  const [datalensRows, payouts] = await Promise.all([
    loadDatalensRows('artist'),
    prisma.payout.findMany({ where: { userId: user.id } }),
  ]);
  let datalens = buildArtistDatalensDashboard(
    datalensRows.rows,
    user,
    parseArtistIdMap(config.datalens.artistIdMap),
  );

  datalens = applyPayoutsToArtistDashboard(datalens, payouts);
  datalens.source = datalensRows.source;

  return { datalens, payouts };
}

// GET /api/artist/dashboard
async function dashboard(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { datalens } = await buildCurrentArtistDashboard(user);

    res.json({
      balance: datalens.summary.balance,
      labelShare: user.labelShare,
      tracksCount: datalens.summary.tracksCount,
      approvedCount: datalens.summary.approvedTracksCount,
      totalEarned: datalens.summary.totalEarned,
      totalStreams: datalens.summary.totalStreams,
      datalensArtist: datalens.datalensArtist,
      source: datalens.source,
      lastEarnings: datalens.lastEarnings,
    });
  } catch (e) { next(e); }
}

// GET /api/artist/analytics — JSON-витрина для личного кабинета артиста
async function analytics(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { datalens } = await buildCurrentArtistDashboard(user);

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
    const datalensRows = await loadDatalensRows('artist');
    res.json({
      tracks: buildArtistDatalensTrackRegistry(
        datalensRows.rows,
        user,
        parseArtistIdMap(config.datalens.artistIdMap),
        localTracks,
      ),
      source: datalensRows.source,
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
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const [{ datalens, payouts }, earnings] = await Promise.all([
      buildCurrentArtistDashboard(user),
      prisma.earning.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { track: { select: { id: true, title: true } } },
      }),
    ]);
    res.json({
      balance: datalens.summary.balance,
      totalEarned: datalens.summary.totalEarned,
      deductedPayouts: datalens.summary.deductedPayouts,
      earnings,
      payouts: payouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    });
  } catch (e) { next(e); }
}

// POST /api/artist/wallet/withdraw  { amount }
async function requestWithdraw(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'amount must be > 0' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const { datalens } = await buildCurrentArtistDashboard(user);
    const availableBalance = datalens.summary.balance;

    if (amount > availableBalance) return res.status(400).json({ error: 'Insufficient balance' });

    const payout = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: Math.max(availableBalance - amount, 0) },
      });
      return tx.payout.create({
        data: { userId: user.id, amount, status: 'REQUESTED' },
      });
    });
    res.status(201).json({
      payout,
      balance: Math.max(availableBalance - amount, 0),
    });
  } catch (e) { next(e); }
}

module.exports = { dashboard, analytics, myTracks, myInvites, wallet, requestWithdraw };
