const prisma = require('../config/prisma');
const config = require('../config');
const { parseArtistIdMap } = require('../utils/datalens');
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
    },
  });
}

async function buildCurrentArtistDashboard(user) {
  if (!config.datalens.dataUrl && isChartsModeAvailable()) {
    const chartsDashboard = await loadArtistChartsDashboard(user, parseArtistIdMap(config.datalens.artistIdMap));
    if (chartsDashboard) return chartsDashboard;
  }

  const datalensRows = await loadDatalensRows('artist');
  const datalens = buildArtistDatalensDashboard(
    datalensRows.rows,
    user,
    parseArtistIdMap(config.datalens.artistIdMap),
  );
  datalens.source = datalensRows.source;
  return datalens;
}

// GET /api/artist/dashboard
async function dashboard(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    const datalens = await buildCurrentArtistDashboard(user);

    res.json({
      balance: datalens.summary.balance,
      labelShare: datalens.summary.labelShare,
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
    const user = await getCurrentUser(req.user.id);
    res.json(await buildCurrentArtistDashboard(user));
  } catch (e) { next(e); }
}

// GET /api/artist/tracks
async function myTracks(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);
    const datalensRows = await loadDatalensRows('artist');

    res.json({
      tracks: buildArtistDatalensTrackRegistry(
        datalensRows.rows,
        user,
        parseArtistIdMap(config.datalens.artistIdMap),
      ),
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
    const datalens = await buildCurrentArtistDashboard(user);

    res.json({
      balance: datalens.summary.balance,
      totalEarned: datalens.summary.totalEarned,
      deductedPayouts: 0,
      earnings: datalens.lastEarnings,
      payouts: [],
      source: datalens.source,
    });
  } catch (e) { next(e); }
}

// POST /api/artist/wallet/withdraw
async function requestWithdraw(req, res) {
  res.status(410).json({
    error: 'Local payouts are disabled',
    message: 'Заявки на выплаты больше не сохраняются в локальной БД. Источник выплат должен быть внешний ERP/DataLens-контур.',
  });
}

module.exports = { dashboard, analytics, myTracks, myInvites, wallet, requestWithdraw };
