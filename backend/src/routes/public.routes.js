const { Router } = require('express');
const pub = require('../controllers/public.controller');

const router = Router();

router.get('/artists', pub.listArtists);
router.get('/artists/:id', pub.getArtist);
router.get('/tracks', pub.listTracks);
router.get('/tracks/:id', pub.getTrack);

module.exports = router;
