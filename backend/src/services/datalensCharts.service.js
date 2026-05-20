const fs = require('fs');
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');

const EMBED_BASE = 'https://datalens.ru';
const CHART_TIMEOUT = 8000;

// Admin dashboard chart IDs (new panels: "ERP: Новые данные. Панель администратора")
const ADMIN_CHART_IDS = {
  byArtist:         'kyu507pt6hic4',
  byTrack:          '8miydg5w98ncs',  // shows label profit per track
  byPeriod:         'cqm3gz20j2e4w',
  byIncomeType:     '3hduo8k9rjtun',
  roleDistribution: 'hvr21lke4fk61',  // pie: Автор / Лейбл / Фит
  bySource:         '1fbp9yya6wh2l',  // stacked bar by platform
};

// Artist dashboard chart IDs (new panels: "ERP: Новые данные. Панель артиста")
const ARTIST_CHART_IDS = {
  byPeriod: 'drn9wqw4epdux',
  byTrack:  'kyujonbmy1084',
};

let privateKeyCache = null;

function readPrivateKey() {
  if (privateKeyCache) return privateKeyCache;
  const { privateKeyPath } = config.datalens;
  if (!privateKeyPath) return null;
  const resolved = path.isAbsolute(privateKeyPath)
    ? privateKeyPath
    : path.resolve(__dirname, '..', '..', privateKeyPath);
  try {
    privateKeyCache = fs.readFileSync(resolved, 'utf8');
    return privateKeyCache;
  } catch {
    return null;
  }
}

function makeEmbedToken(embedId, params = {}) {
  const privateKey = readPrivateKey();
  if (!privateKey || !embedId) return null;
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { embedId, dlEmbedService: 'YC_DATALENS_EMBEDDING_SERVICE_MARK', iat: now, exp: now + 600, params },
    privateKey,
    { algorithm: 'PS256' },
  );
}

async function runChart(embedId, chartId, params = {}) {
  const token = makeEmbedToken(embedId, params);
  if (!token) return null;
  try {
    const r = await axios.post(
      `${EMBED_BASE}/charts/embeds/api/run`,
      { id: chartId, params, responseOptions: { includeLogs: false } },
      { headers: { 'Content-Type': 'application/json', 'x-dl-embed-token': token }, timeout: CHART_TIMEOUT, validateStatus: () => true },
    );
    return r.status === 200 ? r.data : null;
  } catch {
    return null;
  }
}

function toSeriesArray(series) {
  if (!series) return [];
  return Array.isArray(series) ? series : Object.values(series);
}

// series is [[{name, type, data:[{x,y},...]}], [...]] — array of groups
function getFirstSeriesData(chartResponse) {
  const d = chartResponse?.data;
  if (!d) return { points: [], categories: [] };

  const seriesArr = toSeriesArray(d.series);
  const firstGroup = Array.isArray(seriesArr[0]) ? seriesArr[0] : null;
  const firstSeries = firstGroup?.[0];
  const points = firstSeries?.data || [];
  const categories = d.xAxis?.categories || [];
  return { points, categories };
}

function parseBarChart(chartResponse) {
  const { points, categories } = getFirstSeriesData(chartResponse);
  return categories.map((name, i) => ({
    name,
    amount: points.find((p) => p.x === i)?.y ?? points[i]?.y ?? 0,
  }));
}

function parseTimeSeriesChart(chartResponse) {
  const d = chartResponse?.data;
  if (!d) return [];

  // Find revenue_net series; structure: series = array/object of groups [[{name:'revenue_net', data:[...]}]]
  let netPoints = [];
  for (const group of toSeriesArray(d.series)) {
    const groupArr = Array.isArray(group) ? group : [group];
    const netSeries = groupArr.find((s) => s?.name === 'revenue_net');
    if (netSeries) { netPoints = netSeries.data || []; break; }
  }
  if (!netPoints.length) {
    const { points } = getFirstSeriesData(chartResponse);
    netPoints = points;
  }

  return netPoints.map((p) => ({
    period: new Date(p.x).toISOString().slice(0, 7),
    amount: p.y ?? 0,
  }));
}

function parsePieChart(chartResponse) {
  const d = chartResponse?.data;
  if (!d) return [];

  // series[0] = [{type:'pie', data:[{name, y, ...}]}]
  const seriesArr = toSeriesArray(d.series);
  const firstGroup = Array.isArray(seriesArr[0]) ? seriesArr[0] : null;
  const firstSeries = firstGroup?.[0];
  const slices = firstSeries?.data || [];

  return slices.map((s) => ({
    name: s.name || s.formattedName || '',
    amount: s.y ?? s.value ?? 0,
  }));
}

function roundMoney(n) {
  return Math.round((n || 0) * 100) / 100;
}

function hasData(arr) {
  return Array.isArray(arr) && arr.length > 0 && arr.some((item) => item.amount > 0);
}

// Parse stacked bar chart by platform: find series by name, aggregate streams per category
function parseStackedBarBySource(chartResponse, seriesName = 'Стриминг') {
  const d = chartResponse?.data;
  if (!d) return [];

  const categories = d.xAxis?.categories || [];
  const seriesArr = toSeriesArray(d.series);

  // Flatten all series items
  const allSeries = seriesArr.flatMap((g) => (Array.isArray(g) ? g : [g]));
  const target = allSeries.find((s) => s?.name === seriesName) || allSeries.find((s) => (s?.data || []).some((p) => p?.y !== null));

  if (!target) return [];
  const dataPoints = target.data || [];

  return categories
    .map((source, i) => {
      const y = dataPoints.find((p) => p.x === i)?.y ?? dataPoints[i]?.y ?? null;
      return { source, streams: y != null ? Math.round(y) : null };
    })
    .filter((item) => item.streams !== null && item.streams > 0);
}

// Build distribution (Лейбл vs Артисты) from role-distribution pie
function parseRoleDistribution(chartResponse) {
  const slices = parsePieChart(chartResponse);
  if (!slices.length) return [];

  const labelSlice   = slices.find((s) => s.name === 'Лейбл');
  const artistAmount = slices
    .filter((s) => s.name !== 'Лейбл')
    .reduce((sum, s) => sum + s.amount, 0);

  return [
    { name: 'Прибыль лейбла',    amount: roundMoney(labelSlice?.amount || 0) },
    { name: 'Выплаты артистам',  amount: roundMoney(artistAmount) },
  ].filter((item) => item.amount > 0);
}

async function loadAdminChartsDashboard() {
  const embedId = config.datalens.adminEmbedId;
  if (!embedId || !readPrivateKey()) return null;

  const [byArtistR, byTrackR, byPeriodR, byIncomeTypeR, roleDistR, bySourceR] = await Promise.all([
    runChart(embedId, ADMIN_CHART_IDS.byArtist),
    runChart(embedId, ADMIN_CHART_IDS.byTrack),
    runChart(embedId, ADMIN_CHART_IDS.byPeriod),
    runChart(embedId, ADMIN_CHART_IDS.byIncomeType),
    runChart(embedId, ADMIN_CHART_IDS.roleDistribution),
    runChart(embedId, ADMIN_CHART_IDS.bySource),
  ]);

  const byArtistRaw      = parseBarChart(byArtistR);
  const byTrackRaw       = parseBarChart(byTrackR);
  const byPeriodRaw      = parseTimeSeriesChart(byPeriodR);
  const byIncomeTypeRaw  = parsePieChart(byIncomeTypeR);
  const distributionRaw  = parseRoleDistribution(roleDistR);
  const bySourceRaw      = parseStackedBarBySource(bySourceR);

  if (!hasData(byArtistRaw) && !hasData(byTrackRaw)) return null;

  const byArtist = byArtistRaw.map((a, i) => ({
    artistId: `dl-${i}`,
    artistName: a.name,
    amount: roundMoney(a.amount),
  }));

  // byTrack from "ТОП треков по прибыли" = label profit per track
  const byTrack = byTrackRaw.map((t, i) => ({
    trackId: `dl-${i}`,
    trackTitle: t.name,
    amount: roundMoney(t.amount),
  }));

  const periodMap = new Map();
  byPeriodRaw.forEach((p) => {
    const cur = periodMap.get(p.period) || { period: p.period, amount: 0 };
    cur.amount += p.amount;
    periodMap.set(p.period, cur);
  });
  const byPeriod = Array.from(periodMap.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({ period: p.period, amount: roundMoney(p.amount) }));

  const byIncomeType = byIncomeTypeRaw.map((t) => ({ incomeType: t.name, amount: roundMoney(t.amount) }));

  // distribution: label profit vs artist payouts from role-distribution pie
  const distribution = distributionRaw;
  const labelProfitItem = distribution.find((d) => d.name === 'Прибыль лейбла');
  const artistPayoutsItem = distribution.find((d) => d.name === 'Выплаты артистам');
  const labelProfit   = labelProfitItem?.amount || 0;
  const artistPayouts = artistPayoutsItem?.amount || 0;
  const totalTurnover = roundMoney(labelProfit + artistPayouts) || byArtist.reduce((s, a) => s + a.amount, 0);

  // bySource: platform → stream counts
  const bySource = bySourceRaw.map((item) => ({
    source:  item.source,
    streams: item.streams,
    amount:  0,
  }));

  // profitability: byTrack contains label profit per track (from "ТОП треков по прибыли")
  const overallLabelShare = totalTurnover > 0 ? roundMoney((labelProfit / totalTurnover) * 100) : 30;
  const profitability = byTrack.map((t) => ({
    trackId:           t.trackId,
    trackTitle:        t.trackTitle,
    labelProfit:       t.amount,
    artistPayouts:     roundMoney(t.amount / (overallLabelShare / 100) * (1 - overallLabelShare / 100)),
    total:             roundMoney(t.amount / (overallLabelShare / 100)),
    labelSharePercent: overallLabelShare,
  }));

  const totalStreams = bySource.reduce((s, item) => s + item.streams, 0);

  return {
    title: 'ERP: Новые данные. Панель администратора',
    source: {
      mode:           'datalens-charts-api',
      adminEmbedId:   embedId,
      dashboardTitle: 'ERP: Новые данные. Панель администратора',
      apiStatus:      'ok',
    },
    summary: {
      artistsCount:  byArtist.length,
      tracksCount:   byTrack.length,
      totalTurnover,
      labelProfit,
      artistPayouts,
      totalStreams,
    },
    byArtist,
    byTrack,
    byPeriod,
    byIncomeType,
    bySource,
    distribution,
    profitability,
  };
}

function normalizeName(val) {
  return String(val || '').trim().toLowerCase().replace(/[^a-zа-яё0-9]/gi, '');
}

function buildEmptyArtistDashboard(user, mappedArtistId, artistEmbedId, reason) {
  return {
    title:  'ERP: Новые данные. Панель артиста',
    source: {
      mode:           'datalens-charts-api',
      artistEmbedId:  artistEmbedId || config.datalens.adminEmbedId,
      dashboardTitle: 'ERP: Новые данные. Панель артиста',
      apiStatus:      'no-link',
      message:        reason,
    },
    datalensArtist: {
      artistId:   mappedArtistId || user.email,
      artistName: user.name,
    },
    summary: {
      artistName:          user.name,
      datalensArtistName:  user.name,
      balance:             0,
      totalEarned:         0,
      labelShare:          0,
      tracksCount:         0,
      approvedTracksCount: 0,
      earningsCount:       0,
      totalStreams:        0,
    },
    byMonth:      [],
    byTrack:      [],
    bySource:     [],
    byIncomeType: [],
    lastEarnings: [],
  };
}

async function loadArtistChartsDashboard(user, artistIdMap = {}) {
  const artistEmbedId = config.datalens.artistEmbedId;
  const adminEmbedId  = config.datalens.adminEmbedId;
  if ((!artistEmbedId && !adminEmbedId) || !readPrivateKey()) return null;

  // DB field has priority over .env map
  const mappedArtistId = user.datalensArtistId || artistIdMap[String(user.email || '').toLowerCase()] || null;
  const params = mappedArtistId ? { [config.datalens.artistParam || 'artist_id']: mappedArtistId } : {};

  let byPeriodRaw = [];
  let byTrackRaw  = [];
  let artistName  = user.name;
  let totalEarned = 0;
  let linked      = false;

  // 1. Try dedicated artist charts with artist_id filter (only if user is mapped)
  if (artistEmbedId && mappedArtistId) {
    const [byPeriodR, byTrackR] = await Promise.all([
      runChart(artistEmbedId, ARTIST_CHART_IDS.byPeriod, params),
      runChart(artistEmbedId, ARTIST_CHART_IDS.byTrack, params),
    ]);
    byPeriodRaw = parseTimeSeriesChart(byPeriodR);
    byTrackRaw  = parseBarChart(byTrackR);
    if (hasData(byTrackRaw) || hasData(byPeriodRaw)) linked = true;
  }

  // 2. Try matching user by name against admin's "ТОП артистов" chart
  if (!linked && adminEmbedId) {
    const byArtistR    = await runChart(adminEmbedId, ADMIN_CHART_IDS.byArtist);
    const adminArtists = parseBarChart(byArtistR);
    const emailPrefix  = normalizeName(String(user.email || '').split('@')[0]);
    const userName     = normalizeName(user.name);

    const matchedArtist = adminArtists.find((a) => {
      const n = normalizeName(a.name);
      return n && (n === userName || n === emailPrefix);
    });

    if (matchedArtist) {
      linked      = true;
      artistName  = matchedArtist.name;
      totalEarned = matchedArtist.amount;
      // We only know the artist's total from this chart, not per-track / per-period.
      // Leaving byTrack and byPeriod empty avoids showing other artists' tracks.
    }
  }

  // 3. No link → return empty dashboard with a helpful message
  if (!linked) {
    return buildEmptyArtistDashboard(
      user,
      mappedArtistId,
      artistEmbedId,
      'Аккаунт пока не привязан к данным DataLens. Попроси администратора добавить твой artist_id в DATALENS_ARTIST_ID_MAP или убедись, что имя артиста в DataLens совпадает с именем/email-префиксом аккаунта.',
    );
  }

  const monthMap = new Map();
  byPeriodRaw.forEach((p) => {
    const cur = monthMap.get(p.period) || { period: p.period, amount: 0 };
    cur.amount += p.amount;
    monthMap.set(p.period, cur);
  });
  const byMonth = Array.from(monthMap.values())
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({ period: p.period, amount: roundMoney(p.amount) }));
  const byTrack = byTrackRaw.map((t, i) => ({
    trackId:    `dl-${i}`,
    trackTitle: t.name,
    amount:     roundMoney(t.amount),
  }));

  if (!totalEarned) totalEarned = byTrack.reduce((s, t) => s + t.amount, 0);

  return {
    title:  'ERP: Новые данные. Панель артиста',
    source: {
      mode:           'datalens-charts-api',
      artistEmbedId:  artistEmbedId || config.datalens.adminEmbedId,
      dashboardTitle: 'ERP: Новые данные. Панель артиста',
      apiStatus:      'ok',
    },
    datalensArtist: {
      artistId:   mappedArtistId || user.email,
      artistName,
    },
    summary: {
      artistName,
      datalensArtistName:  artistName,
      balance:             roundMoney(totalEarned),
      totalEarned:         roundMoney(totalEarned),
      labelShare:          0,
      tracksCount:         byTrack.length,
      approvedTracksCount: byTrack.length,
      earningsCount:       byTrack.length,
      totalStreams:         0,
    },
    byMonth,
    byTrack,
    bySource:    [],
    byIncomeType: [],
    lastEarnings: byTrack.slice(0, 10).map((t) => ({
      id:         t.trackId,
      trackTitle: t.trackTitle,
      period:     byMonth[0]?.period || '',
      source:     'DataLens',
      amount:     t.amount,
      createdAt:  byMonth[0]?.period || '',
      track:      { id: t.trackId, title: t.trackTitle },
    })),
  };
}

function isChartsModeAvailable() {
  const { adminEmbedId, artistEmbedId, privateKeyPath } = config.datalens;
  return Boolean((adminEmbedId || artistEmbedId) && privateKeyPath && readPrivateKey());
}

module.exports = {
  isChartsModeAvailable,
  loadAdminChartsDashboard,
  loadArtistChartsDashboard,
};
