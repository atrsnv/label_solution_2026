const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');
const prisma = require('../config/prisma');

/**
 * Ожидаемый формат отчёта дистрибьютора (CSV/XLSX):
 *   trackId,amount,period
 * или (если у дистрибьютора нет наших ID):
 *   trackTitle,artistEmail,amount,period
 *
 * Любая строка с amount > 0 — это деньги, которые нужно разнести по сплитам трека.
 */

function readRowsFromFile(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    const wb = XLSX.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }
  // CSV по умолчанию
  const text = fs.readFileSync(filePath, 'utf8');
  return parse(text, { columns: true, skip_empty_lines: true, trim: true });
}

async function resolveTrack(row) {
  if (row.trackId) {
    return prisma.track.findUnique({ where: { id: String(row.trackId) } });
  }
  if (row.trackTitle && row.artistEmail) {
    const owner = await prisma.user.findUnique({
      where: { email: String(row.artistEmail).toLowerCase() },
    });
    if (!owner) return null;
    return prisma.track.findFirst({
      where: { title: String(row.trackTitle), ownerId: owner.id },
    });
  }
  return null;
}

// POST /api/admin/finance/import  (multipart: file)
async function importReport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'File is required (field "file")' });

    const rows = readRowsFromFile(req.file.path, req.file.originalname);
    if (!rows.length) return res.status(400).json({ error: 'Empty report' });

    const report = await prisma.report.create({
      data: { filename: req.file.originalname, rowsCount: rows.length },
    });

    const errors = [];
    let totalAmount = 0;
    let processedRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const amount = parseFloat(row.amount);
      if (!amount || amount <= 0) {
        errors.push({ row: i + 2, reason: 'amount missing or non-positive' });
        continue;
      }
      const track = await resolveTrack(row);
      if (!track) {
        errors.push({ row: i + 2, reason: 'track not found' });
        continue;
      }
      if (track.status !== 'APPROVED') {
        errors.push({ row: i + 2, reason: `track ${track.id} status is ${track.status}` });
        continue;
      }

      // Транзакция: 1) лейбл-доля, 2) сплиты артистов, 3) обновление балансов
      await prisma.$transaction(async (tx) => {
        const splits = await tx.split.findMany({
          where: { trackId: track.id, status: 'ACCEPTED' },
        });
        if (!splits.length) throw new Error(`Track ${track.id} has no accepted splits`);

        const sumShare = splits.reduce((s, x) => s + x.share, 0);
        if (Math.abs(sumShare - 100) > 0.01) {
          throw new Error(`Track ${track.id} splits sum != 100 (got ${sumShare})`);
        }

        // лейбл-часть остаётся "у лейбла" (никому из артистов не идёт)
        const labelCut = amount * (track.labelShare / 100);
        const artistsPool = amount - labelCut;

        for (const sp of splits) {
          const share = artistsPool * (sp.share / 100);
          await tx.earning.create({
            data: {
              trackId: track.id,
              userId: sp.userId,
              amount: share,
              period: row.period ? String(row.period) : null,
              reportId: report.id,
            },
          });
          await tx.user.update({
            where: { id: sp.userId },
            data: { balance: { increment: share } },
          });
        }
      }).then(() => {
        totalAmount += amount;
        processedRows += 1;
      }).catch((e) => {
        errors.push({ row: i + 2, reason: e.message });
      });
    }

    const updated = await prisma.report.update({
      where: { id: report.id },
      data: { totalAmount },
    });

    res.json({
      report: updated,
      processedRows,
      skippedRows: errors.length,
      errors: errors.slice(0, 50),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/finance/reports
async function listReports(req, res, next) {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ reports });
  } catch (err) { next(err); }
}

// GET /api/admin/finance/reports/:id
async function getReport(req, res, next) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        earnings: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            track: { select: { id: true, title: true } },
          },
        },
      },
    });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  } catch (err) { next(err); }
}

module.exports = { importReport, listReports, getReport };
