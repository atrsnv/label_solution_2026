const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildArtistDatalensDashboard,
  buildAdminDatalensDashboard,
  parseDatalensCsv,
} = require('../src/utils/datalensDashboard');

test('parseDatalensCsv parses numeric DataLens rows', () => {
  const rows = parseDatalensCsv([
    'transaction_id,date,track_id,track_title,artist_id,artist_name,role,income_type,source,revenue_gross,revenue_net,streams',
    'TX-1,2026-03-01,TRK-1,Song,LABEL,Лейбл,Лейбл,Стриминг,Яндекс Музыка,100,30,1000',
    'TX-2,2026-03-01,TRK-1,Song,ART-1,Artist,Автор,Стриминг,Яндекс Музыка,100,70,1000',
  ].join('\n'));

  assert.equal(rows.length, 2);
  assert.equal(rows[0].revenue_net, 30);
  assert.equal(rows[1].streams, 1000);
});

test('buildAdminDatalensDashboard aggregates label and artist metrics', () => {
  const rows = parseDatalensCsv([
    'transaction_id,date,track_id,track_title,artist_id,artist_name,role,income_type,source,revenue_gross,revenue_net,streams',
    'TX-1,2026-03-01,TRK-1,Song,LABEL,Лейбл,Лейбл,Стриминг,Яндекс Музыка,100,30,1000',
    'TX-2,2026-03-01,TRK-1,Song,ART-1,Artist,Автор,Стриминг,Яндекс Музыка,100,70,1000',
  ].join('\n'));

  const dashboard = buildAdminDatalensDashboard(rows);

  assert.equal(dashboard.summary.totalTurnover, 100);
  assert.equal(dashboard.summary.labelProfit, 30);
  assert.equal(dashboard.summary.artistPayouts, 70);
  assert.equal(dashboard.summary.totalStreams, 1000);
  assert.deepEqual(dashboard.byArtist, [
    { artistId: 'ART-1', artistName: 'Artist', amount: 70 },
  ]);
  assert.equal(dashboard.profitability[0].labelSharePercent, 30);
});

test('buildArtistDatalensDashboard filters rows by mapped DataLens artist id', () => {
  const rows = parseDatalensCsv([
    'transaction_id,date,track_id,track_title,artist_id,artist_name,role,income_type,source,revenue_gross,revenue_net,streams',
    'TX-1,2026-03-01,TRK-1,Song,ART-1,Artist One,Автор,Стриминг,Яндекс Музыка,100,70,1000',
    'TX-2,2026-03-01,TRK-2,Other,ART-2,Artist Two,Автор,Стриминг,VK Музыка,200,140,2000',
  ].join('\n'));

  const dashboard = buildArtistDatalensDashboard(
    rows,
    { email: 'local@label.local', name: 'Local Name', labelShare: 30 },
    { 'local@label.local': 'ART-2' },
  );

  assert.equal(dashboard.summary.totalEarned, 140);
  assert.equal(dashboard.summary.totalStreams, 2000);
  assert.equal(dashboard.datalensArtist.artistName, 'Artist Two');
  assert.deepEqual(dashboard.byTrack, [
    { trackId: 'TRK-2', trackTitle: 'Other', amount: 140 },
  ]);
});
