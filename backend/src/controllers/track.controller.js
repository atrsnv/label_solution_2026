const prisma = require('../config/prisma');

/**
 * Бизнес-правило по сплитам:
 *  - У трека есть labelShare (% лейбла) — снимок с владельца на момент создания.
 *  - Артисты делят между собой "не лейбловую" часть (т.е. 100 - labelShare).
 *  - В таблице Split хранится share от ЭТОЙ артистской части (в сумме = 100).
 *  - Когда все участники подтвердили (ACCEPTED) — статус трека переходит в APPROVED.
 */

function validateSplits(splits) {
  if (!Array.isArray(splits) || splits.length === 0) {
    return 'splits must be a non-empty array';
  }
  const sum = splits.reduce((s, x) => s + Number(x.share || 0), 0);
  if (Math.abs(sum - 100) > 0.01) {
    return `splits sum must equal 100 (got ${sum})`;
  }
  for (const s of splits) {
    if (!s.userId && !s.email) return 'each split must have userId or email';
    if (typeof s.share !== 'number' || s.share <= 0 || s.share > 100) {
      return 'each split.share must be in (0, 100]';
    }
  }
  return null;
}

// POST /api/tracks  body: { title, coverUrl, releaseDate, splits: [{userId|email, share}] }
async function createTrack(req, res, next) {
  try {
    const { title, coverUrl, releaseDate, splits } = req.body;
    if (!title || !releaseDate) {
      return res.status(400).json({ error: 'title and releaseDate are required' });
    }
    const err = validateSplits(splits);
    if (err) return res.status(400).json({ error: err });

    const owner = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!owner) return res.status(404).json({ error: 'Owner not found' });

    // резолвим userId по email если надо
    const resolved = [];
    for (const s of splits) {
      let userId = s.userId;
      if (!userId && s.email) {
        const u = await prisma.user.findUnique({ where: { email: String(s.email).toLowerCase() } });
        if (!u) return res.status(400).json({ error: `User with email ${s.email} not found` });
        userId = u.id;
      }
      resolved.push({ userId, share: Number(s.share) });
    }

    // должна быть хотя бы одна доля у владельца — иначе странный трек
    const ownerSplit = resolved.find((r) => r.userId === owner.id);
    if (!ownerSplit) {
      return res.status(400).json({ error: 'Owner must be present in splits' });
    }

    // удалить дубликаты по userId
    const seen = new Set();
    for (const r of resolved) {
      if (seen.has(r.userId)) {
        return res.status(400).json({ error: 'Duplicate userId in splits' });
      }
      seen.add(r.userId);
    }

    const track = await prisma.track.create({
      data: {
        title,
        coverUrl: coverUrl || null,
        releaseDate: new Date(releaseDate),
        labelShare: owner.labelShare,
        ownerId: owner.id,
        status: 'PENDING',
        splits: {
          create: resolved.map((r) => ({
            userId: r.userId,
            share: r.share,
            // владелец сразу ACCEPTED, остальные — PENDING
            status: r.userId === owner.id ? 'ACCEPTED' : 'PENDING',
          })),
        },
      },
      include: {
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    // если приглашённых нет — сразу APPROVED
    await maybeApproveTrack(track.id);

    const fresh = await prisma.track.findUnique({
      where: { id: track.id },
      include: {
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    res.status(201).json({ track: fresh });
  } catch (e) {
    next(e);
  }
}

async function maybeApproveTrack(trackId) {
  const splits = await prisma.split.findMany({ where: { trackId } });
  const allAccepted = splits.every((s) => s.status === 'ACCEPTED');
  const anyDisputed = splits.some((s) => s.status === 'DISPUTED');
  let status = 'PENDING';
  if (anyDisputed) status = 'ERROR';
  else if (allAccepted) status = 'APPROVED';
  await prisma.track.update({ where: { id: trackId }, data: { status } });
}

// GET /api/tracks/:id
async function getTrack(req, res, next) {
  try {
    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        splits: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!track) return res.status(404).json({ error: 'Track not found' });

    // доступ: владелец, участник сплита или админ
    const isParticipant = track.ownerId === req.user.id
      || track.splits.some((s) => s.userId === req.user.id);
    if (!isParticipant && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json({ track });
  } catch (e) { next(e); }
}

// POST /api/tracks/:id/splits/respond  body: { action: 'accept'|'dispute' }
async function respondToSplit(req, res, next) {
  try {
    const { action } = req.body;
    if (!['accept', 'dispute'].includes(action)) {
      return res.status(400).json({ error: 'action must be accept or dispute' });
    }
    const split = await prisma.split.findUnique({
      where: { trackId_userId: { trackId: req.params.id, userId: req.user.id } },
    });
    if (!split) return res.status(404).json({ error: 'Split not found for current user' });

    await prisma.split.update({
      where: { id: split.id },
      data: { status: action === 'accept' ? 'ACCEPTED' : 'DISPUTED' },
    });
    await maybeApproveTrack(req.params.id);

    const track = await prisma.track.findUnique({
      where: { id: req.params.id },
      include: { splits: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });
    res.json({ track });
  } catch (e) { next(e); }
}

module.exports = { createTrack, getTrack, respondToSplit, maybeApproveTrack };
