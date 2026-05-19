const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const headers = [
  'transaction_id',
  'date',
  'track_id',
  'track_title',
  'artist_id',
  'artist_name',
  'role',
  'income_type',
  'source',
  'revenue_gross',
  'revenue_net',
  'streams',
];

const tracks = [
  ['TRK-001', 'Новый фит', [
    ['LABEL', 'Лейбл', 'Лейбл', 30],
    ['ART-01', 'Morgenshtern', 'Автор', 40],
    ['ART-02', 'SODA LUV', 'Фит', 30],
  ]],
  ['TRK-002', 'Сольный хит', [
    ['LABEL', 'Лейбл', 'Лейбл', 30],
    ['ART-01', 'Morgenshtern', 'Автор', 70],
  ]],
  ['TRK-003', 'Трек для сериала', [
    ['LABEL', 'Лейбл', 'Лейбл', 30],
    ['ART-03', 'Instasamka', 'Автор', 70],
  ]],
  ['TRK-004', 'Neon Rain', [
    ['LABEL', 'Лейбл', 'Лейбл', 25],
    ['ART-04', 'Masha Wave', 'Автор', 75],
  ]],
  ['TRK-005', 'City Lights', [
    ['LABEL', 'Лейбл', 'Лейбл', 28],
    ['ART-05', 'Nikita Flow', 'Автор', 50],
    ['ART-06', 'Anna Synth', 'Фит', 22],
  ]],
  ['TRK-006', 'Velvet Bass', [
    ['LABEL', 'Лейбл', 'Лейбл', 22],
    ['ART-06', 'Anna Synth', 'Автор', 51],
    ['ART-04', 'Masha Wave', 'Фит', 27],
  ]],
  ['TRK-007', 'Northern Echo', [
    ['LABEL', 'Лейбл', 'Лейбл', 30],
    ['ART-01', 'Morgenshtern', 'Автор', 35],
    ['ART-05', 'Nikita Flow', 'Фит', 17.5],
    ['ART-02', 'SODA LUV', 'Фит', 17.5],
  ]],
];

const months = [
  '2026-03-01',
  '2026-04-01',
  '2026-05-01',
  '2026-06-01',
  '2026-07-01',
  '2026-08-01',
  '2026-09-01',
];
const sources = ['Яндекс Музыка', 'VK Музыка', 'Звук', 'Кинопоиск'];
const incomeTypes = ['Стриминг', 'Стриминг', 'Стриминг', 'Синхронизация'];

const rows = [];
let tx = 2001;

months.forEach((date, monthIndex) => {
  tracks.forEach(([trackId, trackTitle, shares], trackIndex) => {
    const gross = Math.round(
      (90000 + monthIndex * 23000 + trackIndex * 17000) * (1 + (trackIndex % 3) * 0.08),
    );
    const source = sources[(monthIndex + trackIndex) % sources.length];
    const incomeType = incomeTypes[(monthIndex + trackIndex) % incomeTypes.length];
    const streams = incomeType === 'Синхронизация'
      ? 0
      : Math.round(gross * (1.2 + ((monthIndex + trackIndex) % 4) * 0.18));

    shares.forEach(([artistId, artistName, role, percent]) => {
      rows.push([
        `TX-${tx++}`,
        date,
        trackId,
        trackTitle,
        artistId,
        artistName,
        role,
        incomeType,
        source,
        gross,
        Math.round((gross * percent) / 100),
        streams,
      ]);
    });
  });
});

const outDir = path.join(__dirname, '..', 'sample-data');
fs.mkdirSync(outDir, { recursive: true });

const csv = [
  headers.join(','),
  ...rows.map((row) => row.map((value) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')),
].join('\n');

const csvPath = path.join(outDir, 'label_financial_analytics_rich.csv');
const xlsxPath = path.join(outDir, 'label_financial_analytics_rich.xlsx');

fs.writeFileSync(csvPath, csv, 'utf8');

const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
XLSX.writeFile(workbook, xlsxPath);

console.log(JSON.stringify({
  rows: rows.length,
  csv: csvPath,
  xlsx: xlsxPath,
}, null, 2));
