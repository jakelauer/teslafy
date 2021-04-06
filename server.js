const {getVehicle, getVehicleStatus, pause} = require("./vehicle");
const SpotifyWebApi = require('spotify-web-api-node');
const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const {socketError} = require("./socketlog");
const {socketLog, initSocketLog} = require("./socketlog");
const fs = require("fs");
const path = require("path");
const {socketMessages} = require("./socketlog");

const args = process.argv.slice(2);
const isLocal = args[0] === "--local";

const app = express();
const port = process.env.port || 8081;
app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json({
    type: ['application/json', 'text/plain']
}));
app.use(bodyParser.urlencoded({extended: true}));

initSocketLog(isLocal, app)

const spot = new SpotifyWebApi({
    clientId: "f628f0bfb38b4285a37c840bed345307",
    id: "f628f0bfb38b4285a37c840bed345307",
    clientSecret: "dcb3a3dff35044cf841cee708b823d17",
    redirectUri: isLocal ? "http://jlauer.local:8081/auth" : "http://teslafy.jakelauer.dev/auth"
});

app.get("/start", (req, res) => {
    const authorizeUrl = spot.createAuthorizeURL(
        ["user-read-currently-playing", "user-read-playback-state"]
    );

    res.redirect(authorizeUrl);
});

app.get("/auth", (req, res) => {
    const authCode = req.query.code;

    spot.authorizationCodeGrant(authCode).then(data => {
        spot.setAccessToken(data.body['access_token']);
        spot.setRefreshToken(data.body['refresh_token']);

        refresh().then(() => res.redirect("/"));
    })
});

app.get("/status", async (req, res) => {
    if (!spot.getRefreshToken()) {
        res.redirect("/");
        return;
    }

    let code = await isUserPlayingMusic() ? 200 : 500;

    res.status(code).send("");
});

app.get("/", (req, res) => {
    if (!spot.getRefreshToken()) {
        res.redirect("/start");
        return;
    }

    const html = fs.readFileSync(path.join(__dirname, "./index.html"), "utf-8");
    const messagesRendered = socketMessages.map(m => `<div>${m}</div>`)

    const rendered = html.replace(`<pre id="messagebox"></pre>`, `<pre id="messagebox">${messagesRendered.join("")}</pre>`)

    res.send(rendered);
});

const isUserPlayingMusic = async () => {
    if (!spot.getRefreshToken()) {
        socketError("Visit /start to initialize Spotify");

        return false;
    }

    let code = 500;
    try {
        const state = await spot.getMyCurrentPlaybackState();
        if (state.body.is_playing) {
            code = 200;
        }
    } catch (e) {
        console.error(e);
    }

    return code === 200;
}

app.get("/car", async (req, res) => {
    const state = await teslaStatus();

    res.send(state);
})

const refresh = () => {
    socketLog('Refreshing Access Token');
    return spot.refreshAccessToken().then(data => {
        socketLog('The access token has been refreshed!');

        spot.setAccessToken(data.body['access_token']);

        setTimeout(refresh, 60000);
    });
}

const teslaStatus = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const vehicle = await getVehicle();
            if (!vehicle) {
                reject("Cannot get vehicle");
            } else {
                const vehicleData = await getVehicleStatus(vehicle);
                if (vehicleData) {
                    resolve(vehicleData);
                } else {
                    reject("Cannot get vehicle data");
                }
            }
        } catch (e) {
            socketError(e);
            reject(e);
        }
    })
}

const checkStatus = async (lastStatus) => {
    const status = await teslaStatus();
    const userBecamePresent = status.vehicle_state.is_user_present && (!lastStatus || !lastStatus.vehicle_state.is_user_present);

    if (status && status.vehicle_state) {
        const isPlaying = await isUserPlayingMusic();
        socketLog("Is playing: " + isPlaying + ", userPresent: " + userBecamePresent);
        if (userBecamePresent) {
            try {
                if (isPlaying) {
                    await pause(status);
                }
            } catch (e) {
                console.error(e);
            }
        }
    } else {
        socketLog("No vehicle state");
    }

    setTimeout(() => checkStatus(status), 1000);
}

socketLog("ATTEMPTING TO LISTEN ON PORT " + port);
app.listen(port);

setTimeout(() => checkStatus(), 3000);