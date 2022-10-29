/* ___________________________________________________________________________*/

const axios = require('axios');
const WebTorrent = require('webtorrent');
const mime = require('mime-types');
const { google } = require('googleapis');
const parseTorrent = require('parse-torrent');
const fs = require('fs');
const path = require('path');
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./torrentStats');
const archiver = require('archiver');

/* ___________________________________________________________________________*/

const options = {
    connections: 1111,
    uploads: 1,
    tmp: './downloads',
    path: './downloads',
    verify: true,
    dht: true,
    tracker: true,
    trackers: [],
};

const torrentClient = new WebTorrent(options);
var torrentStats = {};
/* ___________________________________________________________________________*/

async function getTrackers() {
    try {
        response = await axios.get('https://newtrackon.com/api/stable');
        return await response.data.split(/[\r\n]+/).filter((e) => e != '');
    } catch (error) {
        return [];
    }
}
(async () => {
    options.trackers = await getTrackers();
})();

/* ___________________________________________________________________________*/

const getStats = (req, res) => {
    let stats;
    try {
        stats = localStorage.getItem(`${req.user.uid}`);
        if (stats !== null) {
            stats = Object.values(JSON.parse(stats));
        } else {
            stats = [];
        }
    } catch (error) {
        stats = [];
    }
    return res.json(stats);
};

const deleteStat = (req, res) => {
    let infoHash = req.body.infoHash;
    let stats = localStorage.getItem(`${req.user.uid}`);

    if (stats !== null) {
        stats = JSON.parse(stats);
    } else {
        stats = {};
    }

    if (stats.hasOwnProperty(infoHash)) {
        delete stats[infoHash];
        localStorage.setItem(`${req.user.uid}`, JSON.stringify(stats));
    }
    return res.status(200).json({ message: 'OK' });
};

const downloadUpload = async (req, torrent) => {
    const oauth2Client = new google.auth.OAuth2();
    let error = {};

    oauth2Client.setCredentials({
        access_token: req.user.accessToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    let folderID = req.body.folderID;

    var fileMetadata = {
        name: torrent.name,
        mimeType: 'application/vnd.google-apps.folder',
    };

    if (folderID !== 'Default') {
        fileMetadata.parents = [folderID];
    }

    drive.files.create(
        {
            resource: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        },
        function (err, file) {
            if (err) {
                error = { error: err.message };
            } else {
                var folderId = file.data.id;

                if (req.body.doZip) {
                    let uploadFolder = path.join('./downloads', torrent.name);
                    let zipFile = path.join('./downloads', torrent.name + '.zip');

                    var output = fs.createWriteStream(zipFile);
                    var archive = archiver('zip', { zlib: { level: 9 } });
                    archive.pipe(output);

                    archive.directory(uploadFolder, torrent.name);
                    archive.finalize();

                    archive.on('error', (err) => (error = { error: err.message }));

                    output.on('close', () => {
                        var fileMetadata = {
                            name: zipFile,
                            parents: [folderId],
                        };
                        var media = {
                            mimeType: mime.lookup(zipFile),
                            body: fs.createReadStream(zipFile),
                        };
                        drive.files.create(
                            {
                                resource: fileMetadata,
                                media: media,
                                fields: 'id',
                                supportsAllDrives: true,
                            },
                            function (err, file) {
                                if (err) {
                                    error = { error: err.message };
                                    console.error(err);
                                }
                            }
                        );
                    });
                } else {
                    torrent.files.forEach(function (file) {
                        var fileMetadata = {
                            name: file.name,
                            parents: [folderId],
                        };
                        var media = {
                            mimeType: mime.lookup(file.name),
                            body: fs.createReadStream('./downloads/' + file.path),
                        };
                        drive.files.create(
                            {
                                resource: fileMetadata,
                                media: media,
                                fields: 'id',
                                supportsAllDrives: true,
                            },
                            function (err, file) {
                                if (err) {
                                    error = { error: err.message };
                                    console.error(err);
                                }
                            }
                        );
                    });
                }
            }
        }
    );
    return error;
};

const downloadTorrent = async (req, res) => {
    let error = {};
    var magnetURI = req.query.magnet;

    try {
        parseTorrent(magnetURI);
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }

    try {
        let torrent = torrentClient.get(magnetURI);

        if (torrent !== null) {
            error = await downloadUpload(req, torrent);

            if (Object.keys(error).length == 0) {
                let stats = {
                    name: torrent.name,
                    infoHash: torrent.infoHash,
                    progress: '100%',
                    timeRemaining: 0,
                    downloaded: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                    speed: (torrent.downloadSpeed / (1024 * 1024)).toFixed(3) + ' MB/sec',
                    totalSize: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                };

                torrentStats[torrent.infoHash] = stats;

                localStorage.setItem(`${req.user.uid}`, JSON.stringify(torrentStats));
            }
        } else {
            torrentClient.add(magnetURI, options, function (torrent) {
                console.log('Client is downloading: ', torrent.infoHash);

                torrent.on('download', function (bytes) {
                    let stats = {
                        name: torrent.name,
                        infoHash: torrent.infoHash,
                        progress: (torrent.progress * 100).toFixed(2) + '%',
                        timeRemaining: torrent.timeRemaining,
                        downloaded: (torrent.downloaded / (1024 * 1024)).toFixed(3) + ' MB',
                        speed: (torrent.downloadSpeed / (1024 * 1024)).toFixed(3) + ' MB/sec',
                        totalSize: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                    };

                    console.log(stats.downloaded + ' of ' + stats.totalSize + ' @ ' + stats.speed);
                });

                var interval = setInterval(function () {
                    torrent.resume();
                    stats = {
                        name: torrent.name,
                        infoHash: torrent.infoHash,
                        progress: (torrent.progress * 100).toFixed(2) + '%',
                        timeRemaining: torrent.timeRemaining / 1000,
                        downloaded: (torrent.downloaded / (1024 * 1024)).toFixed(3) + ' MB',
                        speed: (torrent.downloadSpeed / (1024 * 1024)).toFixed(3) + ' MB/sec',
                        totalSize: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                    };
                    torrentStats[torrent.infoHash] = stats;
                    localStorage.setItem(`${req.user.uid}`, JSON.stringify(torrentStats));
                }, 10000);

                torrent.on('done', async function () {
                    clearInterval(interval);

                    console.log('Client has finished downloading:', torrent.infoHash);

                    error = await downloadUpload(req, torrent);

                    if (Object.keys(error).length == 0) {
                        let stats = {
                            name: torrent.name,
                            infoHash: torrent.infoHash,
                            progress: '100%',
                            timeRemaining: 0,
                            downloaded: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                            speed: (torrent.downloadSpeed / (1024 * 1024)).toFixed(3) + ' MB/sec',
                            totalSize: (torrent.length / (1024 * 1024)).toFixed(3) + ' MB',
                        };
                        torrentStats[torrent.infoHash] = stats;
                        localStorage.setItem(`${req.user.uid}`, JSON.stringify(torrentStats));
                    }
                });

                torrentClient.on('error', function (err) {
                    error = { error: err.message };
                });
            });
        }
        if (Object.keys(error).length !== 0) {
            return res.status(500).json(error);
        }
        return res.json({ isFinished: true });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

/* ___________________________________________________________________________*/

module.exports = {
    getStats: getStats,
    deleteStat: deleteStat,
    downloadTorrent: downloadTorrent,
};

/* ___________________________________________________________________________*/
