/* ___________________________________________________________________________*/

const refresh = require('passport-oauth2-refresh');
const { google } = require('googleapis');

/* ___________________________________________________________________________*/

const refreshToken = async (req, res) => {
    try {
        refresh.requestNewAccessToken(
            'google',
            req.user.refreshToken,
            (err, accessToken, refreshToken) => {
                if (err) {
                    res.status(500).json({ message: err.message });
                }

                let user = req.user;
                user.accessToken = accessToken;

                req.logIn(user, (err) => {
                    if (err) {
                        return res.status(500).json({ message: err.message });
                    }
                    res.json({
                        expiresIn: new Date().setHours(new Date().getHours() + 10),
                    });
                });
            }
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getUser = async (req, res) => {
    try {
        if (!req.user) {
            res.json({ isAuthenticated: false, message: 'User not logged in' });
        }

        let drives = [{ name: 'default', id: 'default' }];

        let user = {
            info: req.user,
            token: {
                access: {
                    expiresIn: new Date().setHours(new Date().getHours() + 10),
                },
                refresh: {
                    expiresIn: new Date().setDate(new Date().getDate() + 7),
                },
            },
        };

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: req.user.accessToken,
        });

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        const response = await drive.drives.list({});

        drives.push.apply(drives, response.data.drives);

        res.json({ user: user, drives: drives });
    } catch (err) {
        res.status(500).json({ isAuthenticated: false, message: err.message });
    }
};

const logout = (req, res) => {
    req.logOut();
    res.json({ loggedOut: true });
};

/* ___________________________________________________________________________*/

module.exports = {
    getUser: getUser,
    refreshToken: refreshToken,
    logout: logout,
};

/* ___________________________________________________________________________*/
