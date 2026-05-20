require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  defaultLabelShare: parseFloat(process.env.DEFAULT_LABEL_SHARE || '30'),
  datalens: {
    iamToken: process.env.DATALENS_IAM_TOKEN || '',
    orgId: process.env.DATALENS_ORG_ID || '',
    entryId: process.env.DATALENS_ENTRY_ID || '',
    embedId: process.env.DATALENS_EMBED_ID || '',
    adminEntryId: process.env.DATALENS_ADMIN_ENTRY_ID || '',
    adminEmbedId: process.env.DATALENS_ADMIN_EMBED_ID || '',
    artistEntryId: process.env.DATALENS_ARTIST_ENTRY_ID || '',
    artistEmbedId: process.env.DATALENS_ARTIST_EMBED_ID || '',
    publicUrl: process.env.DATALENS_PUBLIC_URL || '',
    privateKeyPath: process.env.DATALENS_PRIVATE_KEY_PATH || '',
    tokenTtlSeconds: parseInt(process.env.DATALENS_TOKEN_TTL_SECONDS || '360', 10),
    enableParams: process.env.DATALENS_ENABLE_PARAMS === 'true',
    embedBaseUrl: process.env.DATALENS_EMBED_BASE_URL || 'https://datalens.ru',
    artistParam: process.env.DATALENS_ARTIST_PARAM || 'artist_id',
    artistIdMap: process.env.DATALENS_ARTIST_ID_MAP || '',
    labelId: process.env.DATALENS_LABEL_ID || 'default-label',
    labelParam: process.env.DATALENS_LABEL_PARAM || 'labelId',
    baseUrl: process.env.DATALENS_BASE_URL || 'https://datalens.yandex',
  },
};

module.exports = config;
