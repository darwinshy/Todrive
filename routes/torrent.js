/* ___________________________________________________________________________*/

const router = require('express').Router();
const {
    getStats,
    deleteStat,
    downloadTorrent,
} = require('../controllers/torrent');

/* ___________________________________________________________________________*/

router.get('/stats', getStats);
router.post('/stats', deleteStat);
router.post('/', downloadTorrent);

/* ___________________________________________________________________________*/

module.exports = router;

/* ___________________________________________________________________________*/
