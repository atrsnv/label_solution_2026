const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { isAuth } = require('../middlewares/auth');
const config = require('../config');
const { buildSignedParams, resolveEmbedId } = require('../utils/datalens');

const router = Router();
let cachedPrivateKey = null;

function readPrivateKey() {
  const { privateKeyPath } = config.datalens;
  if (!privateKeyPath) return null;
  if (cachedPrivateKey) return cachedPrivateKey;

  const resolvedPath = path.isAbsolute(privateKeyPath)
    ? privateKeyPath
    : path.resolve(__dirname, '..', '..', privateKeyPath);

  cachedPrivateKey = fs.readFileSync(resolvedPath, 'utf8');
  return cachedPrivateKey;
}

function buildPrivateEmbedUrl(user) {
  const { tokenTtlSeconds, embedBaseUrl } = config.datalens;
  const embedId = resolveEmbedId(user, config.datalens);
  const privateKey = readPrivateKey();
  if (!embedId || !privateKey) return null;

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.min(Math.max(tokenTtlSeconds, 60), 36000);
  const payload = {
    embedId,
    dlEmbedService: 'YC_DATALENS_EMBEDDING_SERVICE_MARK',
    iat: now,
    exp,
    params: buildSignedParams(user, config.datalens),
  };

  const token = jwt.sign(payload, privateKey, { algorithm: 'PS256' });

  const baseUrl = embedBaseUrl.replace(/\/$/, '');

  return {
    url: `${baseUrl}/embeds/dash#dl_embed_token=${token}`,
    expiresAt: exp,
  };
}

function appendDatalensParams(url) {
  const { labelId, labelParam } = config.datalens;
  url.searchParams.set('_embedded', '1');
  url.searchParams.set('_no_controls', '1');
  url.searchParams.set('_theme', 'light');
  url.searchParams.set('_lang', 'ru');

  // For the hackathon MVP we show one label; later this can come from user.labelId.
  if (labelId && labelParam) url.searchParams.set(labelParam, labelId);

  return url.toString();
}

function buildDatalensUrl() {
  const { publicUrl } = config.datalens;

  if (publicUrl) {
    const url = new URL(publicUrl);
    if (url.pathname.startsWith('/embeds/') || url.hash.includes('dl_embed_token=')) {
      return url.toString();
    }

    return appendDatalensParams(url);
  }

  return null;
}

router.get('/embed', isAuth, (req, res, next) => {
  try {
    const privateEmbed = buildPrivateEmbedUrl(req.user);
    const url = privateEmbed?.url || buildDatalensUrl();

    res.set('Cache-Control', 'no-store');

    res.json({
      configured: Boolean(url),
      url,
      expiresAt: privateEmbed?.expiresAt || null,
      entryId: config.datalens.entryId || null,
      embedId: resolveEmbedId(req.user, config.datalens) || null,
      adminEntryId: config.datalens.adminEntryId || null,
      artistEntryId: config.datalens.artistEntryId || null,
      privateKeyConfigured: Boolean(config.datalens.privateKeyPath),
      publicUrlConfigured: Boolean(config.datalens.publicUrl),
      orgId: config.datalens.orgId || null,
      labelId: config.datalens.labelId || null,
      labelParam: config.datalens.labelParam || null,
      artistParam: config.datalens.artistParam || null,
      paramsEnabled: config.datalens.enableParams,
      mode: privateEmbed ? 'single-label-private-iframe' : 'single-label-public-iframe',
      message: url
        ? null
        : 'Set DATALENS_EMBED_ID and DATALENS_PRIVATE_KEY_PATH, or set DATALENS_PUBLIC_URL.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
