/* ___________________________________________________________________________*/
//
const express = require('express');
const app = express();

const userRoutes = require('./routes/user');
const torrentRoutes = require('./routes/torrent');

const passport = require('passport');
const cookieSession = require('cookie-session');
const cors = require('cors');
const sslRedirect = require('heroku-ssl-redirect');
/* ___________________________________________________________________________*/

require('dotenv').config();

const port = process.env.PORT || 3000;

const options = {
    keys: {
        keys: [process.env.SECRET],
    },
    origins: {
        origin: '*',
    },
};

/* ___________________________________________________________________________*/

app.use(cookieSession(options.keys)).use(cors(options.origins));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(sslRedirect.default());

/* ___________________________________________________________________________*/

app.use('/auth', userRoutes);
app.use('/torrent', torrentRoutes);

/* ___________________________________________________________________________*/

app.listen(port, () => {
    console.log('Server listening on port:' + port);
});

/* ___________________________________________________________________________*/

module.exports = app;

/* ___________________________________________________________________________*/
