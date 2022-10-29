/* ___________________________________________________________________________*/

const express = require('express');
const passport = require('passport');
require('../config/authenticate');
const { getUser, refreshToken, logout } = require('../controllers/user');

/* ___________________________________________________________________________*/

const router = express.Router();

/* ___________________________________________________________________________*/

router.get(
    '/google',
    passport.authenticate('google', {
        accessType: 'offline',
        scope: ['profile', 'https://www.googleapis.com/auth/drive', 'email'],
    })
);

router.get('/google/callback', passport.authenticate('google'), (req, res) => {
    res.redirect('/auth/user');
});

/* ___________________________________________________________________________*/

router.get('/user', getUser);
router.get('/refresh', refreshToken);
router.get('/logout', logout);

/* ___________________________________________________________________________*/

module.exports = router;
/* ___________________________________________________________________________*/
