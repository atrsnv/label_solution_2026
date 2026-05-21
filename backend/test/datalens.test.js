const assert = require('node:assert/strict');
const test = require('node:test');
const {
  buildSignedParams,
  parseArtistIdMap,
  resolveEmbedId,
} = require('../src/utils/datalens');

const datalensConfig = {
  enableParams: true,
  artistParam: 'artist_id',
  artistIdMap: 'vasya@label.local:ART-01, petya@label.local:ART-02',
  embedId: 'fallback-embed',
  adminEmbedId: 'admin-embed',
  artistEmbedId: 'artist-embed',
};

test('parseArtistIdMap builds a case-insensitive email map', () => {
  assert.deepEqual(parseArtistIdMap(datalensConfig.artistIdMap), {
    'vasya@label.local': 'ART-01',
    'petya@label.local': 'ART-02',
  });
});

test('buildSignedParams signs artist id only for artist users', () => {
  assert.deepEqual(
    buildSignedParams({ role: 'ARTIST', email: 'Vasya@Label.Local' }, datalensConfig),
    { artist_id: 'ART-01' },
  );
  assert.deepEqual(
    buildSignedParams({ role: 'ADMIN', email: 'admin@label.local' }, datalensConfig),
    {},
  );
});

test('buildSignedParams falls back to email when artist id is not mapped', () => {
  assert.deepEqual(
    buildSignedParams({ role: 'ARTIST', email: 'new@label.local' }, datalensConfig),
    { artist_id: 'new@label.local' },
  );
});

test('buildSignedParams can be disabled entirely', () => {
  assert.deepEqual(
    buildSignedParams(
      { role: 'ARTIST', email: 'vasya@label.local' },
      { ...datalensConfig, enableParams: false },
    ),
    {},
  );
});

test('resolveEmbedId chooses role-specific embeds with fallback', () => {
  assert.equal(resolveEmbedId({ role: 'ADMIN' }, datalensConfig), 'admin-embed');
  assert.equal(resolveEmbedId({ role: 'ARTIST' }, datalensConfig), 'artist-embed');
  assert.equal(resolveEmbedId({ role: 'UNKNOWN' }, datalensConfig), 'fallback-embed');
  assert.equal(
    resolveEmbedId({ role: 'ARTIST' }, { ...datalensConfig, artistEmbedId: '' }),
    'fallback-embed',
  );
});
