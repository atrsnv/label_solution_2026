const { Router } = require('express');
const { isAuth, isArtist } = require('../middlewares/auth');
const artist = require('../controllers/artist.controller');

const router = Router();
router.use(isAuth, isArtist);

router.get('/dashboard', artist.dashboard);
router.get('/tracks', artist.myTracks);
router.get('/invites', artist.myInvites);
router.get('/wallet', artist.wallet);
router.post('/wallet/withdraw', artist.requestWithdraw);

module.exports = router;
