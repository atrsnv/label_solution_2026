const prisma = require('../config/prisma');
const config = require('../config');
const { loadDatalensRows } = require('../services/datalensSource.service');
const { isChartsModeAvailable, loadAdminChartsDashboard } = require('../services/datalensCharts.service');
const {
  buildDatalensArtistRegistry,
  buildDatalensTrackRegistry,
} = require('../utils/datalensDashboard');

const safeParseJson = (val, fallback) => {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};

async function getAdminDashboard() {
  if (!config.datalens.dataUrl && isChartsModeAvailable()) {
    const chartsDashboard = await loadAdminChartsDashboard();
    if (chartsDashboard) return { dashboard: chartsDashboard, rows: null };
  }
  const datalensRows = await loadDatalensRows('admin');
  return { dashboard: null, rows: datalensRows.rows };
}

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

// GET /api/public/artists
async function listArtists(req, res, next) {
  try {
    const [authArtists, { dashboard, rows }] = await Promise.all([
      getAuthArtists(),
      getAdminDashboard(),
    ]);

    if (dashboard) {
      // Charts API mode — use byArtist aggregates
      const artists = dashboard.byArtist.map((a, i) => {
        const local = authArtists.find((u) => u.datalensArtistId === a.artistId || u.name === a.artistName);
        return {
          id: local?.id || `dl-${i}`,
          name: a.artistName,
          createdAt: local?.createdAt || null,
          tracksCount: 0,
          tracks: [],
        };
      });
      return res.json({ artists });
    }

    const registry = buildDatalensArtistRegistry(rows, authArtists);
    res.json({
      artists: registry.map((a) => ({
        id: a.id,
        name: a.name,
        createdAt: a.createdAt,
        tracksCount: a._count?.ownedTracks ?? 0,
        tracks: [],
      })),
    });
  } catch (err) { next(err); }
}

// GET /api/public/artists/:id
async function getArtist(req, res, next) {
  try {
    const [authArtists, datalensRows] = await Promise.all([
      getAuthArtists(),
      loadDatalensRows('admin'),
    ]);

    const registry = buildDatalensArtistRegistry(datalensRows.rows, authArtists);
    const artist = registry.find((a) => a.id === req.params.id);

    if (!artist) return res.status(404).json({ error: 'Артист не найден' });

    const artistTracks = buildDatalensTrackRegistry(
      datalensRows.rows.filter((r) => r.artist_id === artist.datalensArtistId),
    );

    res.json({
      artist: {
        id: artist.id,
        name: artist.name,
        createdAt: artist.createdAt,
        tracksCount: artistTracks.length,
        tracks: artistTracks.map((t) => ({
          id: t.id,
          title: t.title,
          releaseDate: t.releaseDate,
          coverUrl: t.coverUrl,
          createdAt: t.createdAt,
          collaborators: t.collaborators,
        })),
      },
    });
  } catch (err) { next(err); }
}

// GET /api/public/tracks
async function listTracks(req, res, next) {
  try {
    const [{ dashboard, rows }, localReleases] = await Promise.all([
      getAdminDashboard(),
      prisma.release.findMany({
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
    ]);

    let dlTracks = [];

    if (dashboard) {
      // Charts API mode — use byTrack aggregates
      dlTracks = dashboard.byTrack.map((t) => ({
        id: t.trackId,
        title: t.trackTitle,
        releaseDate: null,
        coverUrl: null,
        createdAt: null,
        collaborators: [],
        artist: null,
      }));
    } else if (rows && rows.length > 0) {
      dlTracks = buildDatalensTrackRegistry(rows).map((t) => ({
        id: t.id,
        title: t.title,
        releaseDate: t.releaseDate,
        coverUrl: t.coverUrl,
        createdAt: t.createdAt,
        collaborators: t.collaborators.map((c) => ({ name: c.name, role: c.role })),
        artist: t.owner ? { id: t.owner.id, name: t.owner.name } : null,
      }));
    }

    const localTracks = localReleases.map((r) => ({
      id: r.id,
      title: r.title,
      releaseDate: r.releaseDate,
      coverUrl: r.coverUrl || null,
      createdAt: r.createdAt,
      collaborators: safeParseJson(r.collaborators, []),
      artist: r.user ? { id: r.user.id, name: r.user.name } : null,
    }));

    res.json({ tracks: [...dlTracks, ...localTracks] });
  } catch (err) { next(err); }
}

// GET /api/public/tracks/:id
async function getTrack(req, res, next) {
  try {
    const release = await prisma.release.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!release || release.status !== 'APPROVED') {
      return res.status(404).json({ error: 'Трек не найден' });
    }

    res.json({
      track: {
        id: release.id,
        title: release.title,
        releaseDate: release.releaseDate,
        coverUrl: release.coverUrl || null,
        createdAt: release.createdAt,
        collaborators: release.collaborators ? JSON.parse(release.collaborators) : [],
        artist: release.user ? { id: release.user.id, name: release.user.name } : null,
      },
    });
  } catch (err) { next(err); }
}

module.exports = { listArtists, getArtist, listTracks, getTrack };
