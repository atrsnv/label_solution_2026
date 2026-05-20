const { Router } = require('express');
const { isAuth, isAdmin } = require('../middlewares/auth');
const admin = require('../controllers/admin.controller');
const finance = require('../controllers/finance.controller');

const router = Router();

router.use(isAuth, isAdmin);

// Dashboard
router.get('/dashboard/summary', admin.dashboardSummary);
router.get('/analytics', admin.analytics);
router.get('/datalens-dashboard', admin.datalensDashboard);

// Artists
router.get('/artists', admin.listArtists);
router.post('/artists', admin.createArtistDirect);
router.post('/artists/invite', admin.createInvite);
router.get('/artists/:id', admin.getArtist);
router.patch('/artists/:id', admin.updateArtist);

// Tracks (полный реестр)
router.get('/tracks', admin.listAllTracks);

// Finance
router.post('/finance/import', finance.importReport);
router.get('/finance/reports', finance.listReports);
router.get('/finance/reports/:id', finance.getReport);

module.exports = router;
