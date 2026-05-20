const prisma = require('../config/prisma');

// ─── Validation helpers ─────────────────────────────────────────────────────

function validateRequisites(details) {
  if (!details || typeof details !== 'object') return 'Укажи реквизиты для выплаты.';
  const { type } = details;

  if (type === 'bank') {
    if (!details.fullName?.trim()) return 'Укажи ФИО получателя.';
    if (!details.bank?.trim()) return 'Укажи название банка.';
    if (!/^\d{9}$/.test(details.bik)) return 'БИК должен содержать 9 цифр.';
    if (!/^\d{20}$/.test(details.account)) return 'Расчётный счёт должен содержать 20 цифр.';
    return null;
  }
  if (type === 'sbp') {
    if (!details.fullName?.trim()) return 'Укажи ФИО получателя.';
    if (!/^\+7\d{10}$/.test(details.phone)) return 'Телефон должен быть в формате +7XXXXXXXXXX.';
    return null;
  }
  return 'Тип реквизитов должен быть "bank" или "sbp".';
}

// ─── Artist: profile (payout details) ────────────────────────────────────────

// GET /api/artist/profile
async function getProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, payoutDetails: true },
    });
    const payoutDetails = user.payoutDetails ? JSON.parse(user.payoutDetails) : null;
    res.json({ profile: { ...user, payoutDetails } });
  } catch (err) { next(err); }
}

// PATCH /api/artist/profile  { payoutDetails: { type, ... } }
async function updateProfile(req, res, next) {
  try {
    const { payoutDetails } = req.body;
    const err = validateRequisites(payoutDetails);
    if (err) return res.status(422).json({ error: err });

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { payoutDetails: JSON.stringify(payoutDetails) },
      select: { id: true, name: true, email: true, payoutDetails: true },
    });
    res.json({ profile: { ...user, payoutDetails } });
  } catch (err) { next(err); }
}

// ─── Artist: payout requests ─────────────────────────────────────────────────

// POST /api/artist/wallet/withdraw  { amount, details? }
async function requestWithdraw(req, res, next) {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(422).json({ error: 'Укажи сумму больше 0.' });

    // Use provided details or fall back to saved profile details
    let details = req.body.details ?? null;
    if (!details) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { payoutDetails: true },
      });
      if (user.payoutDetails) details = JSON.parse(user.payoutDetails);
    }

    const err = validateRequisites(details);
    if (err) return res.status(422).json({ error: err });

    // Save details to profile for next time
    await prisma.user.update({
      where: { id: req.user.id },
      data: { payoutDetails: JSON.stringify(details) },
    });

    const payout = await prisma.payout.create({
      data: {
        userId: req.user.id,
        amount,
        status: 'REQUESTED',
        details: JSON.stringify(details),
      },
    });

    res.json({ ok: true, payout });
  } catch (err) { next(err); }
}

// GET /api/artist/wallet/payouts
async function listMyPayouts(req, res, next) {
  try {
    const payouts = await prisma.payout.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      payouts: payouts.map((p) => ({
        ...p,
        details: p.details ? JSON.parse(p.details) : null,
      })),
    });
  } catch (err) { next(err); }
}

// ─── Admin: payout management ────────────────────────────────────────────────

// GET /api/admin/payouts
async function listPayouts(req, res, next) {
  try {
    const payouts = await prisma.payout.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    res.json({
      payouts: payouts.map((p) => ({
        ...p,
        details: p.details ? JSON.parse(p.details) : null,
      })),
    });
  } catch (err) { next(err); }
}

// PATCH /api/admin/payouts/:id  { status: 'APPROVED' | 'REJECTED', comment? }
async function updatePayout(req, res, next) {
  try {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(422).json({ error: 'status должен быть APPROVED или REJECTED' });
    }

    const payout = await prisma.payout.findUnique({ where: { id: req.params.id } });
    if (!payout) return res.status(404).json({ error: 'Заявка не найдена' });
    if (payout.status !== 'REQUESTED') {
      return res.status(409).json({ error: 'Заявка уже обработана' });
    }

    const updated = await prisma.payout.update({
      where: { id: req.params.id },
      data: { status, comment: comment?.trim() || null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.json({ payout: { ...updated, details: updated.details ? JSON.parse(updated.details) : null } });
  } catch (err) { next(err); }
}

module.exports = {
  getProfile, updateProfile,
  requestWithdraw, listMyPayouts,
  listPayouts, updatePayout,
};
