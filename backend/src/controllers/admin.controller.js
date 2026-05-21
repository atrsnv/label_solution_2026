const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');

const safeParseJson = (val, fallback) => {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};
const config = require('../config');
const {
  buildAdminDatalensDashboard,
  buildDatalensArtistRegistry,
  buildDatalensTrackRegistry,
} = require('../utils/datalensDashboard');
const { loadDatalensRows } = require('../services/datalensSource.service');
const {
  isChartsModeAvailable,
  loadAdminChartsDashboard,
  loadArtistChartsDashboard,
} = require('../services/datalensCharts.service');

const roundMoney = (value) => {
  const amount = Number(value) || 0;
  return Math.abs(amount) < 0.005 ? 0 : Number(amount.toFixed(2));
};

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
      datalensArtistId: true,
      labelShare: true,
      _count: { select: { releases: true } },
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
  const artists = await getAuthArtists();

  if (!config.datalens.dataUrl && isChartsModeAvailable()) {
    const chartsDashboard = await loadAdminChartsDashboard();
    if (chartsDashboard) {
      return applyContractProfitability(chartsDashboard, artists);
    }
  }

  const datalensRows = await loadDatalensRows('admin');
  const dashboard = buildAdminDatalensDashboard(datalensRows.rows, artists);
  dashboard.source = datalensRows.source;
  return dashboard;
}

async function buildChartModeArtistRegistry(artists) {
  const dashboard = await getAdminDatalensDashboard();
  const dashboardArtists = new Map(
    dashboard.byArtist.map((artist) => [
      normalizeName(artist.artistName),
      artist,
    ]),
  );

  const artistDashboards = await Promise.all(
    artists.map(async (artist) => {
      try {
        return [artist.id, await loadArtistChartsDashboard(artist)];
      } catch {
        return [artist.id, null];
      }
    }),
  );
  const artistDashboardById = new Map(artistDashboards);

  const registry = artists.map((artist) => {
    const artistDashboard = artistDashboardById.get(artist.id);
    const matched = dashboardArtists.get(normalizeName(artist.name));
    const dlTracksCount = artistDashboard?.summary?.tracksCount ?? 0;
    const dbReleasesCount = artist._count?.releases ?? 0;
    const tracksCount = dlTracksCount || dbReleasesCount;

    return {
      id: artist.id,
      email: artist.email,
      name: artistDashboard?.datalensArtist?.artistName || artist.name,
      tracksCount,
      releases: tracksCount,
      labelShare: artist.labelShare ?? 0,
      balance: matched?.amount ?? artistDashboard?.summary?.totalEarned ?? 0,
      createdAt: artist.createdAt,
      datalensArtistId: artist.datalensArtistId,
      source: artistDashboard?.source?.apiStatus === 'ok' ? 'Auth + DataLens' : 'Auth only',
      hasAccount: true,
      _count: { ownedTracks: tracksCount },
    };
  });

  dashboard.byArtist.forEach((artist, index) => {
    const alreadyIncluded = registry.some((item) => (
      normalizeName(item.name) === normalizeName(artist.artistName)
    ));
    if (alreadyIncluded) return;

    registry.push({
      id: artist.artistId || `dl-${index}`,
      email: 'Нет аккаунта в ERP',
      name: artist.artistName,
      tracksCount: 0,
      releases: 0,
      labelShare: 0,
      balance: artist.amount,
      createdAt: null,
      datalensArtistId: artist.artistId,
      source: 'DataLens',
      hasAccount: false,
      _count: { ownedTracks: 0 },
    });
  });

  return {
    artists: registry.sort((first, second) => first.name.localeCompare(second.name, 'ru')),
    source: dashboard.source,
  };
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, '');
}

function applyContractProfitability(dashboard, artists) {
  const shares = artists
    .map((artist) => Number(artist.labelShare))
    .filter((share) => !Number.isNaN(share) && share >= 0 && share <= 100);

  if (shares.length === 0) return dashboard;

  const defaultShare = roundMoney(
    shares.reduce((sum, share) => sum + share, 0) / shares.length,
  );

  return {
    ...dashboard,
    profitability: dashboard.profitability.map((item) => {
      const total = item.total || (
        item.labelSharePercent > 0 ? item.labelProfit / (item.labelSharePercent / 100) : item.labelProfit
      );
      const labelProfit = roundMoney((total * defaultShare) / 100);

      return {
        ...item,
        labelProfit,
        artistPayouts: roundMoney(total - labelProfit),
        total: roundMoney(total),
        labelSharePercent: defaultShare,
        contractSource: 'ERP average',
      };
    }),
  };
}

// GET /api/admin/artists
async function listArtists(req, res, next) {
  try {
    const [artists, datalensRows] = await Promise.all([
      getAuthArtists(),
      loadDatalensRows('admin'),
    ]);

    if (datalensRows.rows.length === 0 && isChartsModeAvailable()) {
      try {
        return res.json(await buildChartModeArtistRegistry(artists));
      } catch {
        // DataLens unavailable — fall through to auth-only registry
      }
    }

    res.json({
      artists: buildDatalensArtistRegistry(datalensRows.rows, artists),
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
    const registry = buildDatalensArtistRegistry(datalensRows.rows, artists);
    const artist = registry.find((item) => item.id === req.params.id);

    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json({ artist, source: datalensRows.source });
  } catch (err) { next(err); }
}

// PATCH /api/admin/artists/:id  { name?, datalensArtistId?, labelShare? }
async function updateArtist(req, res, next) {
  try {
    const { name, datalensArtistId, labelShare } = req.body;
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const data = { name: name.trim() };

    if (datalensArtistId !== undefined) {
      data.datalensArtistId = typeof datalensArtistId === 'string' && datalensArtistId.trim()
        ? datalensArtistId.trim()
        : null;
    }

    if (labelShare !== undefined) {
      const ls = Number(labelShare);
      if (Number.isNaN(ls) || ls < 0 || ls > 100) {
        return res.status(400).json({ error: 'labelShare должен быть числом от 0 до 100' });
      }
      data.labelShare = ls;
    }

    const artist = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true, datalensArtistId: true, labelShare: true },
    });

    res.json({ artist });
  } catch (err) { next(err); }
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

// POST /api/admin/artists  { email, name, password, labelShare? }
async function createArtistDirect(req, res, next) {
  try {
    const { email, name, password, labelShare } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name, password are required' });
    }

    const share = labelShare === undefined ? 10 : Number(labelShare);
    if (Number.isNaN(share) || share < 0 || share > 100) {
      return res.status(400).json({ error: 'labelShare должен быть числом от 0 до 100' });
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
        labelShare: share,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true, labelShare: true },
    });

    res.status(201).json({ artist });
  } catch (err) { next(err); }
}

// GET /api/admin/tracks
async function listAllTracks(req, res, next) {
  try {
    const [datalensRows, localReleases] = await Promise.all([
      loadDatalensRows('admin'),
      prisma.release.findMany({
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const dlTracks = buildDatalensTrackRegistry(datalensRows.rows);
    const localTracks = localReleases.map((r) => ({
      id: r.id,
      datalensTrackId: null,
      title: r.title,
      releaseDate: r.releaseDate,
      createdAt: r.createdAt,
      status: r.status,
      labelShare: r.user?.labelShare ?? 10,
      source: 'local',
      coverUrl: r.coverUrl || null,
      comment: r.comment || null,
      owner: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
      collaborators: safeParseJson(r.collaborators, []),
      splits: [],
    }));

    res.json({
      tracks: [...localTracks, ...dlTracks],
      source: datalensRows.source,
    });
  } catch (err) { next(err); }
}

// PATCH /api/admin/releases/:id  { status: 'APPROVED'|'REJECTED', comment? }
async function updateRelease(req, res, next) {
  try {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status должен быть APPROVED или REJECTED' });
    }
    const release = await prisma.release.findUnique({ where: { id: req.params.id } });
    if (!release) return res.status(404).json({ error: 'Релиз не найден' });

    const updated = await prisma.release.update({
      where: { id: req.params.id },
      data: { status, comment: comment?.trim() || null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({
      track: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        comment: updated.comment,
        owner: updated.user,
      },
    });
  } catch (err) { next(err); }
}

// GET /api/admin/dashboard/summary
async function dashboardSummary(req, res, next) {
  try {
    const [dashboard, localApproved, localPending] = await Promise.all([
      getAdminDatalensDashboard(),
      prisma.release.count({ where: { status: 'APPROVED' } }),
      prisma.release.count({ where: { status: 'PENDING' } }),
    ]);

    const topArtists = dashboard.byArtist.slice(0, 5).map((artist) => ({
      id: artist.artistId,
      name: artist.artistName,
      balance: artist.amount,
    }));

    res.json({
      artistsCount: dashboard.summary.artistsCount,
      tracksCount: dashboard.summary.tracksCount + localApproved,
      approvedTracks: dashboard.summary.tracksCount + localApproved,
      pendingTracks: localPending,
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
  updateRelease,
  dashboardSummary,
  analytics,
  datalensDashboard,
};
