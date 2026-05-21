const prisma = require('../config/prisma');

// POST /api/tracks
async function createTrack(req, res, next) {
  try {
    const { title, releaseDate, coverUrl, collaborators } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Укажи название релиза.' });
    if (!releaseDate) return res.status(400).json({ error: 'Укажи дату релиза.' });

    const release = await prisma.release.create({
      data: {
        userId: req.user.id,
        title: title.trim(),
        releaseDate,
        coverUrl: coverUrl || null,
        collaborators: collaborators ? JSON.stringify(collaborators) : null,
        status: 'PENDING',
      },
    });

    res.status(201).json({ track: releaseToTrack(release) });
  } catch (err) { next(err); }
}

// GET /api/tracks/:id
async function getTrack(req, res, next) {
  try {
    const release = await prisma.release.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!release) return res.status(404).json({ error: 'Релиз не найден.' });
    res.json({ track: releaseToTrack(release) });
  } catch (err) { next(err); }
}

function respondToSplit(req, res) {
  res.status(410).json({ error: 'Splits are managed via DataLens.' });
}

const safeParseJson = (val, fallback) => {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
};

function releaseToTrack(r) {
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
    owner: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
    collaborators: safeParseJson(r.collaborators, []),
    splits: [],
    comment: r.comment || null,
  };
}

module.exports = { createTrack, getTrack, respondToSplit };
