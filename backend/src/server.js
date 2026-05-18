const express = require('express');
const cors = require('cors');
const config = require('./config');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const artistRoutes = require('./routes/artist.routes');
const trackRoutes = require('./routes/tracks.routes');
const datalensRoutes = require('./routes/datalens.routes');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/artist', artistRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/datalens', datalensRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
    details: err.details,
  });
});

app.listen(config.port, () => {
  console.log(`Label ERP backend listening on http://localhost:${config.port}`);
});
