const prisma = require('../config/prisma');

const safeParseJson = (val, fallback) => {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};
const {
  buildArtistDatalensTrackRegistry,
  buildArtistDatalensDashboard,
} = require('../utils/datalensDashboard');
const { loadDatalensRows } = require('../services/datalensSource.service');
const { isChartsModeAvailable, loadArtistChartsDashboard } = require('../services/datalensCharts.service');

async function getCurrentUser(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      datalensArtistId: true,
      labelShare: true,
    },
  });
}

const config = require('../config');

async function buildCurrentArtistDashboard(user) {
  if (!config.datalens.dataUrl && isChartsModeAvailable()) {
    const chartsDashboard = await loadArtistChartsDashboard(user);
    if (chartsDashboard) return chartsDashboard;
  }

  const datalensRows = await loadDatalensRows('artist');
  const datalens = buildArtistDatalensDashboard(datalensRows.rows, user);
  datalens.source = datalensRows.source;
  return datalens;
}

async function getDeductedPayouts(userId) {
  const payouts = await prisma.payout.findMany({
    where: { userId, status: { in: ['REQUESTED', 'APPROVED'] } },
    select: { amount: true },
  });
  return payouts.reduce((sum, p) => sum + p.amount, 0);
}

async function getDealEarnings(userId) {
  const agg = await prisma.deal.aggregate({
    where: { artistId: userId },
    _sum: { artistAmount: true },
  });
  return agg._sum.artistAmount || 0;
}

// GET /api/artist/dashboard
async function dashboard(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    const [datalens, deductedPayouts, approvedLocalCount, dealEarnings] = await Promise.all([
      buildCurrentArtistDashboard(user),
      getDeductedPayouts(req.user.id),
      prisma.release.count({ where: { userId: req.user.id, status: 'APPROVED' } }),
      getDealEarnings(req.user.id),
    ]);

    const totalEarned = datalens.summary.totalEarned + dealEarnings;
    const balance = Math.max(0, totalEarned - deductedPayouts);

    res.json({
      balance,
      labelShare: user.labelShare ?? 0,
      tracksCount: datalens.summary.tracksCount + approvedLocalCount,
      approvedCount: datalens.summary.approvedTracksCount + approvedLocalCount,
      totalEarned,
      dealEarnings,
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
    const user = await getCurrentUser(req.user.id);
    res.json(await buildCurrentArtistDashboard(user));
  } catch (e) { next(e); }
}

function releaseToTrack(r, userName, userEmail) {
  return {
    id: r.id,
    datalensTrackId: null,
    title: r.title,
    releaseDate: r.releaseDate,
    createdAt: r.createdAt,
    status: r.status,
    labelShare: 0,
    source: 'local',
    coverUrl: r.coverUrl || null,
    owner: { id: r.userId, name: userName, email: userEmail },
    collaborators: safeParseJson(r.collaborators, []),
    splits: [],
    comment: r.comment || null,
  };
}

// GET /api/artist/tracks
async function myTracks(req, res, next) {
  try {
    const [user, localReleases] = await Promise.all([
      getCurrentUser(req.user.id),
      prisma.release.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const localTracks = localReleases.map((r) => releaseToTrack(r, user.name, user.email));

    if (!config.datalens.dataUrl && isChartsModeAvailable()) {
      const dashboard = await buildCurrentArtistDashboard(user);
      const dlTracks = (dashboard.byTrack || []).map((t) => ({
        id: t.trackId,
        datalensTrackId: t.trackId,
        title: t.trackTitle,
        releaseDate: null,
        createdAt: null,
        status: 'APPROVED',
        labelShare: 0,
        source: 'DataLens',
        coverUrl: null,
        owner: { id: t.trackId, name: dashboard.datalensArtist?.artistName || user.name, email: user.email },
        collaborators: [],
        splits: [],
      }));
      return res.json({ tracks: [...localTracks, ...dlTracks], source: dashboard.source });
    }

    const datalensRows = await loadDatalensRows('artist');
    const dlTracks = buildArtistDatalensTrackRegistry(datalensRows.rows, user);
    res.json({
      tracks: [...localTracks, ...dlTracks],
      source: datalensRows.source,
    });
  } catch (e) { next(e); }
}

// GET /api/artist/invites
async function myInvites(req, res, next) {
  try {
    res.json({
      invites: [],
      source: 'disabled-local-splits',
      message: 'Локальные сплиты отключены: релизы и участники приходят из DataLens.',
    });
  } catch (e) { next(e); }
}

// GET /api/artist/wallet
async function wallet(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    const [datalens, payouts, deductedPayouts, dealEarnings] = await Promise.all([
      buildCurrentArtistDashboard(user),
      prisma.payout.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } }),
      getDeductedPayouts(req.user.id),
      getDealEarnings(req.user.id),
    ]);

    const totalEarned = datalens.summary.totalEarned + dealEarnings;
    const balance = Math.max(0, totalEarned - deductedPayouts);

    res.json({
      balance,
      totalEarned,
      deductedPayouts,
      earnings: datalens.lastEarnings,
      payouts: payouts.map((p) => ({ ...p, details: p.details ? JSON.parse(p.details) : null })),
      source: datalens.source,
    });
  } catch (e) { next(e); }
}

module.exports = { dashboard, analytics, myTracks, myInvites, wallet };
