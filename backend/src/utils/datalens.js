function parseArtistIdMap(artistIdMap = '') {
  return artistIdMap
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [email, artistId] = pair.split(':').map((part) => part?.trim());
      if (email && artistId) acc[email.toLowerCase()] = artistId;
      return acc;
    }, {});
}

function buildSignedParams(user, datalensConfig) {
  const { enableParams, artistParam, artistIdMap } = datalensConfig;
  if (!enableParams) return {};

  const params = {};
  if (user?.role === 'ARTIST' && artistParam) {
    const mappedArtistId = parseArtistIdMap(artistIdMap)[user.email?.toLowerCase()];
    params[artistParam] = mappedArtistId || user.email;
  }

  return params;
}

function resolveEmbedId(user, datalensConfig) {
  const {
    embedId,
    adminEmbedId,
    artistEmbedId,
  } = datalensConfig;

  if (user?.role === 'ADMIN') return adminEmbedId || embedId;
  if (user?.role === 'ARTIST') return artistEmbedId || embedId;
  return embedId;
}

module.exports = {
  buildSignedParams,
  parseArtistIdMap,
  resolveEmbedId,
};
