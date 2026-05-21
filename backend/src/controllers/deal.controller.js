const prisma = require('../config/prisma');

// POST /api/admin/deals
async function createDeal(req, res, next) {
  try {
    const { artistId, organization, totalAmount, artistPercent, comment } = req.body;

    if (!artistId || !organization || totalAmount == null || artistPercent == null) {
      return res.status(400).json({ error: 'artistId, organization, totalAmount, artistPercent обязательны' });
    }

    const total = Number(totalAmount);
    const percent = Number(artistPercent);

    if (Number.isNaN(total) || total <= 0) {
      return res.status(400).json({ error: 'Неверная сумма' });
    }
    if (Number.isNaN(percent) || percent < 0 || percent > 100) {
      return res.status(400).json({ error: 'Процент артиста должен быть от 0 до 100' });
    }

    const artist = await prisma.user.findUnique({ where: { id: artistId } });
    if (!artist) return res.status(404).json({ error: 'Артист не найден' });

    const artistAmount = (total * percent) / 100;
    const labelAmount = total - artistAmount;

    const deal = await prisma.deal.create({
      data: {
        artistId,
        organization: organization.trim(),
        totalAmount: total,
        artistPercent: percent,
        artistAmount,
        labelAmount,
        comment: comment?.trim() || null,
      },
      include: { artist: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ deal });
  } catch (err) { next(err); }
}

// GET /api/admin/deals
async function listDeals(req, res, next) {
  try {
    const deals = await prisma.deal.findMany({
      orderBy: { createdAt: 'desc' },
      include: { artist: { select: { id: true, name: true, email: true } } },
    });
    res.json({ deals });
  } catch (err) { next(err); }
}

// GET /api/artist/deals
async function myDeals(req, res, next) {
  try {
    const deals = await prisma.deal.findMany({
      where: { artistId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ deals });
  } catch (err) { next(err); }
}

module.exports = { createDeal, listDeals, myDeals };
