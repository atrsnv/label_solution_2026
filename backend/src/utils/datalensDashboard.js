const { addAmount, roundMoney } = require('./analytics');

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function parseDatalensCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    return {
      ...row,
      revenue_gross: Number(row.revenue_gross || 0),
      revenue_net: Number(row.revenue_net || 0),
      streams: Number(row.streams || 0),
    };
  });
}

function monthKey(date) {
  return String(date || '').slice(0, 7) || 'Без периода';
}

function toSortedArray(map, amountKey = 'amount') {
  return Array.from(map.values())
    .map((item) => ({ ...item, [amountKey]: roundMoney(item[amountKey]) }))
    .sort((a, b) => b[amountKey] - a[amountKey]);
}

function buildAdminDatalensDashboard(rows, users = []) {
  const labelRows = rows.filter((row) => row.role === 'Лейбл');
  const artistRows = rows.filter((row) => row.role !== 'Лейбл');

  const byArtistMap = new Map();
  const byTrackMap = new Map();
  const byPeriodMap = new Map();
  const bySourceMap = new Map();
  const byIncomeTypeMap = new Map();
  const distributionMap = new Map();
  const trackProfitMap = new Map();
  const uniqueStreams = new Map();

  rows.forEach((row) => {
    addAmount(byTrackMap, row.track_id, row.revenue_net, {
      trackId: row.track_id,
      trackTitle: row.track_title,
    });
    addAmount(byIncomeTypeMap, row.income_type, row.revenue_net, {
      incomeType: row.income_type,
    });
    addAmount(distributionMap, row.role === 'Лейбл' ? 'label' : 'artists', row.revenue_net, {
      name: row.role === 'Лейбл' ? 'Прибыль лейбла' : 'Выплаты артистам',
    });

    const trackProfit = trackProfitMap.get(row.track_id) || {
      trackId: row.track_id,
      trackTitle: row.track_title,
      labelProfit: 0,
      artistPayouts: 0,
      total: 0,
      artists: new Map(),
    };

    if (row.role === 'Лейбл') {
      trackProfit.labelProfit += row.revenue_net;
    } else {
      trackProfit.artistPayouts += row.revenue_net;
      trackProfit.artists.set(row.artist_id, {
        artistId: row.artist_id,
        artistName: row.artist_name,
      });
    }

    trackProfit.total += row.revenue_net;
    trackProfitMap.set(row.track_id, trackProfit);

    const streamKey = `${row.date}:${row.track_id}:${row.source}:${row.income_type}`;
    if (!uniqueStreams.has(streamKey)) {
      uniqueStreams.set(streamKey, row);
    }
  });

  artistRows.forEach((row) => {
    addAmount(byArtistMap, row.artist_id, row.revenue_net, {
      artistId: row.artist_id,
      artistName: row.artist_name,
    });
  });

  labelRows.forEach((row) => {
    addAmount(byPeriodMap, monthKey(row.date), row.revenue_net, {
      period: monthKey(row.date),
    });
  });

  uniqueStreams.forEach((row) => {
    const source = row.source || 'Неизвестный источник';
    const current = bySourceMap.get(source) || {
      source,
      streams: 0,
      amount: 0,
    };

    current.streams += row.streams;
    current.amount += row.revenue_net;
    bySourceMap.set(source, current);
  });

  const totalLabelProfit = labelRows.reduce((sum, row) => sum + row.revenue_net, 0);
  const totalArtistPayouts = artistRows.reduce((sum, row) => sum + row.revenue_net, 0);
  const totalTurnover = totalLabelProfit + totalArtistPayouts;
  const totalStreams = Array.from(uniqueStreams.values())
    .reduce((sum, row) => sum + row.streams, 0);

  return {
    title: 'ERP: Новые данные. Панель администратора',
    source: 'DataLens dataset: Dimensions',
    summary: {
      totalTurnover: roundMoney(totalTurnover),
      labelProfit: roundMoney(totalLabelProfit),
      artistPayouts: roundMoney(totalArtistPayouts),
      totalStreams,
      tracksCount: new Set(rows.map((row) => row.track_id)).size,
      artistsCount: new Set(artistRows.map((row) => row.artist_id)).size,
    },
    byArtist: toSortedArray(byArtistMap),
    byTrack: toSortedArray(byTrackMap),
    byPeriod: Array.from(byPeriodMap.values()).map((item) => ({
      ...item,
      amount: roundMoney(item.amount),
    })),
    bySource: Array.from(bySourceMap.values())
      .map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      }))
      .sort((a, b) => b.streams - a.streams),
    byIncomeType: toSortedArray(byIncomeTypeMap),
    distribution: toSortedArray(distributionMap),
    profitability: Array.from(trackProfitMap.values())
      .map((item) => {
        const trackArtists = Array.from(item.artists.values());
        const mainArtist = trackArtists[0] || null;
        const localUser = mainArtist
          ? findLocalUserForArtist(mainArtist.artistId, mainArtist.artistName, users)
          : null;
        const labelSharePercent = localUser?.labelShare ?? (
          item.total ? roundMoney((item.labelProfit / item.total) * 100) : 0
        );
        const total = roundMoney(item.total);

        return {
          trackId: item.trackId,
          trackTitle: item.trackTitle,
          artistId: mainArtist?.artistId || null,
          artistName: mainArtist?.artistName || null,
          contractSource: localUser ? 'ERP' : 'DataLens',
          labelProfit: roundMoney((total * labelSharePercent) / 100),
          artistPayouts: roundMoney(total - ((total * labelSharePercent) / 100)),
          total,
          labelSharePercent: roundMoney(labelSharePercent),
        };
      })
      .sort((a, b) => b.labelProfit - a.labelProfit),
  };
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]/gi, '');
}

function resolveArtistRows(rows, user) {
  const artistId = user.datalensArtistId || null;
  const userName = normalizeName(user.name);
  const userEmailName = normalizeName(String(user.email || '').split('@')[0]);

  return rows.filter((row) => {
    if (row.role === 'Лейбл') return false;
    if (artistId && row.artist_id === artistId) return true;

    const artistName = normalizeName(row.artist_name);

    return artistName === userName || artistName === userEmailName;
  });
}

function findLocalUserForArtist(artistId, artistName, users) {
  const normalizedArtistName = normalizeName(artistName);

  return users.find((user) => {
    return user.datalensArtistId === artistId || normalizeName(user.name) === normalizedArtistName;
  }) || null;
}

function buildDatalensArtistRegistry(rows, users) {
  const artists = new Map();

  rows
    .filter((row) => row.role !== 'Лейбл')
    .forEach((row) => {
      const current = artists.get(row.artist_id) || {
        artistId: row.artist_id,
        artistName: row.artist_name,
        tracks: new Set(),
        amount: 0,
      };

      current.tracks.add(row.track_id);
      current.amount += row.revenue_net;
      artists.set(row.artist_id, current);
    });

  const registry = Array.from(artists.values()).map((artist) => {
    const localUser = findLocalUserForArtist(
      artist.artistId,
      artist.artistName,
      users,
    );

    return {
      id: localUser?.id || `dl-${artist.artistId}`,
      email: localUser?.email || 'Нет аккаунта в ERP',
      name: artist.artistName,
      tracksCount: artist.tracks.size,
      releases: artist.tracks.size,
      labelShare: localUser?.labelShare ?? 0,
      balance: roundMoney(artist.amount),
      createdAt: localUser?.createdAt || null,
      datalensArtistId: artist.artistId,
      source: localUser ? 'Auth + DataLens' : 'DataLens',
      hasAccount: Boolean(localUser),
      _count: { ownedTracks: artist.tracks.size + (localUser?._count?.releases ?? 0) },
    };
  });

  users
    .filter((user) => user.role === 'ARTIST')
    .forEach((user) => {
      const alreadyIncluded = registry.some((artist) => artist.id === user.id);
      if (alreadyIncluded) return;

      registry.push({
        id: user.id,
        email: user.email,
        name: user.name,
        tracksCount: user._count?.releases ?? 0,
        releases: user._count?.releases ?? 0,
        labelShare: user.labelShare ?? 0,
        balance: 0,
        createdAt: user.createdAt,
        datalensArtistId: null,
        source: 'Auth only',
        hasAccount: true,
        _count: { ownedTracks: user._count?.releases ?? 0 },
      });
    });

  return registry.sort((first, second) => {
    if (first.hasAccount !== second.hasAccount) return first.hasAccount ? -1 : 1;

    return first.name.localeCompare(second.name, 'ru');
  });
}

function buildDatalensTrackRegistry(rows) {
  const tracks = new Map();

  rows.forEach((row) => {
    const current = tracks.get(row.track_id) || {
      id: `dl-${row.track_id}`,
      datalensTrackId: row.track_id,
      title: row.track_title,
      releaseDate: row.date,
      createdAt: row.date,
      status: 'APPROVED',
      labelShare: 30,
      source: 'DataLens',
      coverUrl: null,
      artists: new Map(),
      splits: [],
    };

    if (row.role !== 'Лейбл') {
      current.artists.set(row.artist_id, {
        id: `dl-${row.artist_id}`,
        name: row.artist_name,
        email: 'DataLens',
        role: row.role,
      });
    }

    if (new Date(row.date) > new Date(current.createdAt)) {
      current.createdAt = row.date;
      current.releaseDate = row.date;
    }

    tracks.set(row.track_id, current);
  });

  const registry = Array.from(tracks.values()).map((track) => {
    const artistsList = Array.from(track.artists.values());
    const owner = artistsList.find((artist) => artist.role === 'Автор')
      || artistsList[0]
      || { id: 'dl-unknown', name: 'Неизвестный артист', email: 'DataLens' };

    return {
      id: track.id,
      datalensTrackId: track.datalensTrackId,
      title: track.title,
      releaseDate: track.releaseDate,
      createdAt: track.createdAt,
      status: track.status,
      labelShare: track.labelShare,
      source: track.source,
      coverUrl: track.coverUrl,
      owner,
      collaborators: artistsList,
      splits: [],
    };
  });

  return registry.sort((first, second) => {
    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  });
}

function buildArtistDatalensTrackRegistry(rows, user) {
  const artistRows = resolveArtistRows(rows, user);
  // Collect all track IDs the artist participated in (including feats)
  const trackIds = new Set(artistRows.map((row) => row.track_id));
  // Use full rows for those tracks so all collaborators and owner info are preserved
  const trackRows = rows.filter((row) => trackIds.has(row.track_id));
  return buildDatalensTrackRegistry(trackRows);
}

function buildArtistDatalensDashboard(rows, user) {
  const artistRows = resolveArtistRows(rows, user);
  const byMonthMap = new Map();
  const byTrackMap = new Map();
  const bySourceMap = new Map();
  const byIncomeTypeMap = new Map();

  artistRows.forEach((row) => {
    const period = monthKey(row.date);

    addAmount(byMonthMap, period, row.revenue_net, {
      period,
      streams: 0,
    });
    byMonthMap.get(period).streams += row.streams;

    addAmount(byTrackMap, row.track_id, row.revenue_net, {
      trackId: row.track_id,
      trackTitle: row.track_title,
    });
    addAmount(bySourceMap, row.source, row.revenue_net, {
      source: row.source,
      streams: 0,
    });
    addAmount(byIncomeTypeMap, row.income_type, row.revenue_net, {
      incomeType: row.income_type,
    });

    const source = bySourceMap.get(row.source);
    source.streams += row.streams;
  });

  const totalEarned = artistRows.reduce((sum, row) => sum + row.revenue_net, 0);
  const totalStreams = artistRows.reduce((sum, row) => sum + row.streams, 0);
  const tracks = new Set(artistRows.map((row) => row.track_id));
  const datalensArtist = artistRows[0]
    ? {
      artistId: artistRows[0].artist_id,
      artistName: artistRows[0].artist_name,
    }
    : null;

  return {
    title: 'ERP: Новые данные. Панель артиста',
    source: 'DataLens dataset: Dimensions',
    datalensArtist,
    summary: {
      artistName: user.name,
      datalensArtistName: datalensArtist?.artistName || user.name,
      balance: roundMoney(totalEarned),
      totalEarned: roundMoney(totalEarned),
      labelShare: 0,
      tracksCount: tracks.size,
      approvedTracksCount: tracks.size,
      earningsCount: artistRows.length,
      totalStreams,
    },
    byMonth: Array.from(byMonthMap.values()).map((item) => ({
      ...item,
      amount: roundMoney(item.amount),
    })),
    byTrack: toSortedArray(byTrackMap),
    bySource: Array.from(bySourceMap.values())
      .map((item) => ({
        ...item,
        amount: roundMoney(item.amount),
      }))
      .sort((a, b) => b.streams - a.streams),
    byIncomeType: toSortedArray(byIncomeTypeMap),
    lastEarnings: artistRows
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
      .map((row) => ({
        id: row.transaction_id,
        trackTitle: row.track_title,
        period: row.income_type,
        source: row.source,
        amount: roundMoney(row.revenue_net),
        createdAt: row.date,
        track: {
          id: row.track_id,
          title: row.track_title,
        },
      })),
  };
}

module.exports = {
  parseDatalensCsv,
  buildAdminDatalensDashboard,
  buildArtistDatalensDashboard,
  buildArtistDatalensTrackRegistry,
  buildDatalensArtistRegistry,
  buildDatalensTrackRegistry,
};
