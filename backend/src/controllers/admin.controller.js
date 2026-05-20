const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const config = require('../config');
const { addAmount, roundMoney } = require('../utils/analytics');

// ---------- АРТИСТЫ ----------

// GET /api/admin/artists
async function listArtists(req, res, next) {
  try {
    const artists = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, email: true, name: true, labelShare: true, balance: true, createdAt: true,
        _count: { select: { ownedTracks: true } },
      },
    });
    res.json({ artists });
  } catch (err) { next(err); }
}

// GET /api/admin/artists/:id
async function getArtist(req, res, next) {
  try {
    const artist = await prisma.user.findFirst({
      where: { id: req.params.id, role: 'ARTIST' },
      include: {
        ownedTracks: { orderBy: { createdAt: 'desc' } },
        payouts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    delete artist.password;
    res.json({ artist });
  } catch (err) { next(err); }
}

// PATCH /api/admin/artists/:id  { labelShare?, name? }
async function updateArtist(req, res, next) {
  try {
    const { labelShare, name } = req.body;
    const data = {};
    if (typeof labelShare === 'number') {
      if (labelShare < 0 || labelShare > 100) {
        return res.status(400).json({ error: 'labelShare must be 0..100' });
      }
      data.labelShare = labelShare;
    }
    if (typeof name === 'string') data.name = name;

    const artist = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, labelShare: true, balance: true },
    });
    res.json({ artist });
  } catch (err) { next(err); }
}

// POST /api/admin/artists/invite  { email? }  -> { inviteUrl, token, tempPassword? }
async function createInvite(req, res, next) {
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней
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
        // фронт сам подставит свой origin
        path: `/register?token=${invite.token}`,
      },
    });
  } catch (err) { next(err); }
}

// POST /api/admin/artists  { email, name, password, labelShare? }
// быстрый ручной способ создать артиста с временным паролем
async function createArtistDirect(req, res, next) {
  try {
    const { email, name, password, labelShare } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name, password are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const artist = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashed,
        name,
        role: 'ARTIST',
        labelShare: typeof labelShare === 'number' ? labelShare : config.defaultLabelShare,
      },
      select: { id: true, email: true, name: true, labelShare: true, balance: true },
    });
    res.status(201).json({ artist });
  } catch (err) { next(err); }
}

// ---------- ТРЕКИ ЛЕЙБЛА ----------

// GET /api/admin/tracks
async function listAllTracks(req, res, next) {
  try {
    const tracks = await prisma.track.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        splits: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    res.json({ tracks });
  } catch (err) { next(err); }
}

// ---------- ДАШБОРД ----------

// GET /api/admin/dashboard/summary
async function dashboardSummary(req, res, next) {
  try {
    const [artistsCount, tracksCount, approvedTracks, totalEarnings, pendingPayouts] = await Promise.all([
      prisma.user.count({ where: { role: 'ARTIST' } }),
      prisma.track.count(),
      prisma.track.count({ where: { status: 'APPROVED' } }),
      prisma.earning.aggregate({ _sum: { amount: true } }),
      prisma.payout.aggregate({ where: { status: 'REQUESTED' }, _sum: { amount: true } }),
    ]);

    const topArtists = await prisma.user.findMany({
      where: { role: 'ARTIST' },
      orderBy: { balance: 'desc' },
      take: 5,
      select: { id: true, name: true, balance: true },
    });

    res.json({
      artistsCount,
      tracksCount,
      approvedTracks,
      totalEarnings: totalEarnings._sum.amount || 0,
      pendingPayouts: pendingPayouts._sum.amount || 0,
      topArtists,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/analytics
async function analytics(req, res, next) {
  try {
    const [artistsCount, tracksCount, approvedTracks, earnings, payouts] = await Promise.all([
      prisma.user.count({ where: { role: 'ARTIST' } }),
      prisma.track.count(),
      prisma.track.count({ where: { status: 'APPROVED' } }),
      prisma.earning.findMany({
        orderBy: [{ period: 'asc' }, { createdAt: 'asc' }],
        include: {
          user: { select: { id: true, name: true, email: true } },
          track: { select: { id: true, title: true } },
        },
      }),
      prisma.payout.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const byArtistMap = new Map();
    const byTrackMap = new Map();
    const byMonthMap = new Map();

    earnings.forEach((earning) => {
      addAmount(byArtistMap, earning.userId, earning.amount, {
        artistId: earning.userId,
        artistName: earning.user?.name || earning.user?.email || 'Неизвестный артист',
      });
      addAmount(byTrackMap, earning.trackId, earning.amount, {
        trackId: earning.trackId,
        trackTitle: earning.track?.title || 'Неизвестный трек',
      });
      addAmount(byMonthMap, earning.period || 'Без периода', earning.amount, {
        period: earning.period || 'Без периода',
      });
    });

    const totalEarnings = earnings.reduce((sum, earning) => sum + Number(earning.amount || 0), 0);
    const pendingPayouts = payouts
      .filter((payout) => payout.status === 'REQUESTED')
      .reduce((sum, payout) => sum + Number(payout.amount || 0), 0);

    res.json({
      summary: {
        artistsCount,
        tracksCount,
        approvedTracks,
        totalEarnings: roundMoney(totalEarnings),
        pendingPayouts: roundMoney(pendingPayouts),
        earningsCount: earnings.length,
      },
      byArtist: Array.from(byArtistMap.values())
        .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
        .sort((a, b) => b.amount - a.amount),
      byTrack: Array.from(byTrackMap.values())
        .map((item) => ({ ...item, amount: roundMoney(item.amount) }))
        .sort((a, b) => b.amount - a.amount),
      byMonth: Array.from(byMonthMap.values()).map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      })),
      payouts: payouts.slice(0, 6).map((payout) => ({
        id: payout.id,
        amount: roundMoney(payout.amount),
        status: payout.status,
        createdAt: payout.createdAt,
      })),
      lastEarnings: earnings
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8)
        .map((earning) => ({
          id: earning.id,
          artistName: earning.user?.name || earning.user?.email || 'Неизвестный артист',
          trackTitle: earning.track?.title || 'Неизвестный трек',
          period: earning.period || 'Без периода',
          amount: roundMoney(earning.amount),
        })),
    });
  } catch (err) { next(err); }
}

module.exports = {
  listArtists,
  getArtist,
  updateArtist,
  createInvite,
  createArtistDirect,
  listAllTracks,
  dashboardSummary,
  analytics,
};
