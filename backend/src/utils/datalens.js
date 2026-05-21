function buildSignedParams(user, datalensConfig) {
  const { enableParams, artistParam } = datalensConfig;
  if (!enableParams) return {};

  const params = {};
  if (user?.role === 'ARTIST' && artistParam) {
    params[artistParam] = user.datalensArtistId || user.email;
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
  resolveEmbedId,
};
