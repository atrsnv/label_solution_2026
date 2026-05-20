const path = require('path');
const fs = require('fs');
const { parseDatalensCsv } = require('../utils/datalensDashboard');
const { clearDatalensSourceCache } = require('../services/datalensSource.service');
const { setRuntimeDataFilePath } = require('../state/dataPath');
const prisma = require('../config/prisma');

const DATA_CURRENT_PATH = path.join(__dirname, '..', '..', 'uploads', 'data-current.csv');

const REQUIRED_COLUMNS = [
  'transaction_id', 'date', 'track_id', 'track_title',
  'artist_id', 'artist_name', 'role', 'income_type',
  'source', 'revenue_gross', 'revenue_net', 'streams',
];

function validateCsvColumns(content) {
  const firstLine = content.split(/\r?\n/)[0] || '';
  const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  return missing.length ? missing : null;
}

// POST /api/admin/finance/import  (multipart: file)
async function importReport(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не прикреплён' });

    const uploadedPath = req.file.path;
    const content = fs.readFileSync(uploadedPath, 'utf8');

    const missingCols = validateCsvColumns(content);
    if (missingCols) {
      return res.status(422).json({
        error: `Неверный формат CSV. Отсутствуют обязательные колонки: ${missingCols.join(', ')}`,
        requiredColumns: REQUIRED_COLUMNS,
        missingColumns: missingCols,
      });
    }

    const rows = parseDatalensCsv(content);

    if (rows.length === 0) {
      return res.status(422).json({ error: 'Файл пустой или не удалось распознать формат CSV' });
    }

    const totalAmount = rows.reduce((sum, row) => sum + (row.revenue_net || 0), 0);

    // Save as the current active data file
    const uploadsDir = path.dirname(DATA_CURRENT_PATH);
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.copyFileSync(uploadedPath, DATA_CURRENT_PATH);
    setRuntimeDataFilePath(DATA_CURRENT_PATH);

    await prisma.report.create({
      data: {
        filename: req.file.originalname,
        totalAmount: Math.round(totalAmount * 100) / 100,
        rowsCount: rows.length,
      },
    });

    clearDatalensSourceCache();

    res.json({
      ok: true,
      filename: req.file.originalname,
      rowsCount: rows.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    });
  } catch (err) { next(err); }
}

// GET /api/admin/finance/reports
async function listReports(req, res, next) {
  try {
    const reports = await prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
    res.json({ reports });
  } catch (err) { next(err); }
}

// GET /api/admin/finance/reports/:id
async function getReport(req, res, next) {
  try {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: 'Отчёт не найден' });
    res.json({ report });
  } catch (err) { next(err); }
}

module.exports = { importReport, listReports, getReport };
