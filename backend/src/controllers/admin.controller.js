const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const config = require('../config');
const {
  buildAdminDatalensDashboard,
  buildDatalensArtistRegistry,
  buildDatalensTrackRegistry,
} = require('../utils/datalensDashboard');
const { parseArtistIdMap } = require('../utils/datalens');
const { loadDatalensRows } = require('../services/datalensSource.service');
const { isChartsModeAvailable, loadAdminChartsDashboard } = require('../services/datalensCharts.service');

async function getAuthArtists() {
  return prisma.user.findMany({
    where: { role: 'ARTIST' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });
}

function toAdminAnalyticsPayload(dashboard) {
  return {
    summary: {
      artistsCount: dashboard.summary.artistsCount,
      tracksCount: dashboard.summary.tracksCount,
      approvedTracks: dashboard.summary.tracksCount,
      totalEarnings: dashboard.summary.totalTurnover,
      pendingPayouts: 0,
      earningsCount: dashboard.byTrack.length,
    },
    byArtist: dashboard.byArtist,
    byTrack: dashboard.byTrack,
    byMonth: dashboard.byPeriod,
    payouts: [],
    lastEarnings: dashboard.byTrack.slice(0, 8).map((item) => ({
      id: item.trackId,
      artistName: 'DataLens',
      trackTitle: item.trackTitle,
      period: 'DataLens',
      amount: item.amount,
    })),
    source: dashboard.source,
  };
}

async function getAdminDatalensDashboard() {
  if (!config.datalens.dataUrl && isChartsModeAvailable()) {
    const chartsDashboard = await loadAdminChartsDashboard();
    if (chartsDashboard) return chartsDashboard;
  }

  const datalensRows = await loadDatalensRows('admin');
  const dashboard = buildAdminDatalensDashboard(datalensRows.rows);
  dashboard.source = datalensRows.source;
  return dashboard;
}

// GET /api/admin/artists
async function listArtists(req, res, next) {
  try {
    const [artists, datalensRows] = await Promise.all([
      getAuthArtists(),
      loadDatalensRows('admin'),
    ]);

    res.json({
      artists: buildDatalensArtistRegistry(
        datalensRows.rows,
        artists,
        parseArtistIdMap(config.datalens.artistIdMap),
      ),
      source: datalensRows.source,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/artists/:id
async function getArtist(req, res, next) {
  try {
    const [artists, datalensRows] = await Promise.all([
      getAuthArtists(),
      loadDatalensRows('admin'),
    ]);
    const registry = buildDatalensArtistRegistry(
      datalensRows.rows,
      artists,
      parseArtistIdMap(config.datalens.artistIdMap),
    );
    const artist = registry.find((item) => item.id === req.params.id);

    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json({ artist, source: datalensRows.source });
  } catch (err) { next(err); }
}

// PATCH /api/admin/artists/:id  { name?, datalensArtistId? }
async function updateArtist(req, res, next) {
  try {
    const { name } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const artist = await prisma.user.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    res.json({ artist });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/artists/:id
async function deleteArtist(req, res, next) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Артист не найден' });
    if (user.role === 'ADMIN') return res.status(403).json({ error: 'Нельзя удалить администратора' });

    const id = req.params.id;
    // Delete earnings on tracks owned by this user (other collaborators' earnings)
    await prisma.$executeRawUnsafe('DELETE FROM "Earning" WHERE "trackId" IN (SELECT "id" FROM "Track" WHERE "ownerId" = ?)', id);
    // Delete this user's own earnings and payouts
    await prisma.$executeRawUnsafe('DELETE FROM "Earning" WHERE "userId" = ?', id);
    await prisma.$executeRawUnsafe('DELETE FROM "Payout" WHERE "userId" = ?', id);
    // Delete splits: where user is collaborator, or on tracks owned by this user
    await prisma.$executeRawUnsafe('DELETE FROM "Split" WHERE "userId" = ?', id);
    await prisma.$executeRawUnsafe('DELETE FROM "Split" WHERE "trackId" IN (SELECT "id" FROM "Track" WHERE "ownerId" = ?)', id);
    // Delete tracks, invites, then the user
    await prisma.$executeRawUnsafe('DELETE FROM "Track" WHERE "ownerId" = ?', id);
    await prisma.$executeRawUnsafe('DELETE FROM "Invite" WHERE "createdById" = ?', id);
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// POST /api/admin/artists/invite  { email? }  -> { inviteUrl, token }
async function createInvite(req, res, next) {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invite = await prisma.invite.create({
      data: {
        token,
        email: req.body.email ? String(req.body.email).toLowerCase() : null,
        createdById: req.user.id,
        expiresAt,
      },
    });

    res.status(201).json({
      invite: {
        id: invite.id,
        token: invite.token,
        email: invite.email,
        expiresAt: invite.expiresAt,
        path: `/register?token=${invite.token}`,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/admin/artists  { email, name, password }
async function createArtistDirect(req, res, next) {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name, password are required' });
    }
    const normalizedEmail = String(email).toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const artist = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name,
        role: 'ARTIST',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });

    res.status(201).json({ artist });
  } catch (err) { next(err); }
}

// GET /api/admin/tracks
async function listAllTracks(req, res, next) {
  try {
    const datalensRows = await loadDatalensRows('admin');
    res.json({
      tracks: buildDatalensTrackRegistry(datalensRows.rows),
      source: datalensRows.source,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/dashboard/summary
async function dashboardSummary(req, res, next) {
  try {
    const dashboard = await getAdminDatalensDashboard();
    const topArtists = dashboard.byArtist.slice(0, 5).map((artist) => ({
      id: artist.artistId,
      name: artist.artistName,
      balance: artist.amount,
    }));

    res.json({
      artistsCount: dashboard.summary.artistsCount,
      tracksCount: dashboard.summary.tracksCount,
      approvedTracks: dashboard.summary.tracksCount,
      totalEarnings: dashboard.summary.totalTurnover,
      pendingPayouts: 0,
      topArtists,
      source: dashboard.source,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/analytics
async function analytics(req, res, next) {
  try {
    const dashboard = await getAdminDatalensDashboard();
    res.json(toAdminAnalyticsPayload(dashboard));
  } catch (err) { next(err); }
}

// GET /api/admin/datalens-dashboard
async function datalensDashboard(req, res, next) {
  try {
    res.json(await getAdminDatalensDashboard());
  } catch (err) { next(err); }
}

module.exports = {
  listArtists,
  getArtist,
  updateArtist,
  deleteArtist,
  createInvite,
  createArtistDirect,
  listAllTracks,
  dashboardSummary,
  analytics,
  datalensDashboard,
};
