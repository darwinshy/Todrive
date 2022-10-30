/* ___________________________________________________________________________*/

const router = require('express').Router();
const { getStats, deleteStat, downloadTorrentUsingMagnet } = require('../controllers/torrent');

/* ___________________________________________________________________________*/

router.get('/stats', getStats);
router.post('/stats', deleteStat);
router.post('/', downloadTorrentUsingMagnet);

/* ___________________________________________________________________________*/

module.exports = router;

/* ___________________________________________________________________________*/
