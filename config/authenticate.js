/* ___________________________________________________________________________*/

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const refresh = require('passport-oauth2-refresh');

/* ___________________________________________________________________________*/

require('dotenv').config();

/* ___________________________________________________________________________*/

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

/* ___________________________________________________________________________*/

const googleStrategy = new GoogleStrategy(
    {
        callbackURL: '/auth/google/callback',
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
    async (accessToken, refreshToken, profile, cb) => {
        try {
            let user = {
                name: profile.displayName,
                uid: profile.id,
                email: profile._json.email,
                avatar: profile._json.picture,
                accessToken: accessToken,
                refreshToken: refreshToken,
            };
            console.log(profile);
            cb(null, user);
        } catch (err) {
            cb(err, null);
        }
    }
);

/* ___________________________________________________________________________*/

passport.use(googleStrategy);
refresh.use(googleStrategy);

/* ___________________________________________________________________________*/
