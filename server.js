const {getVehicle, getVehicleStatus, pause} = require("./vehicle");
const SpotifyWebApi = require('spotify-web-api-node');
const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

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

const spot = new SpotifyWebApi({
    clientId: "f628f0bfb38b4285a37c840bed345307",
    id: "f628f0bfb38b4285a37c840bed345307",
    clientSecret: "dcb3a3dff35044cf841cee708b823d17",
    redirectUri: isLocal ? "http://jlauer.local:5000/auth" : "http://teslafy.jakelauer.dev/auth"
});


app.get("/", (req, res) => {
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

        refresh().then(() => res.redirect("/status"));
    })
});

app.get("/status", async (req, res) => {
    if (!spot.getRefreshToken()) {
        res.redirect("/");
        return;
    }

    let code = await isUserPlayingMusic() ? 200 : 500;

    res.status(code).send("");
})

const isUserPlayingMusic = async () => {
    const state = await spot.getMyCurrentPlaybackState();

    let code = 500;
    try {
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
    console.log('Refreshing Access Token');
    return spot.refreshAccessToken().then(data => {
        console.log('The access token has been refreshed!');

        spot.setAccessToken(data.body['access_token']);

        setTimeout(refresh, 60000);
    });
}

const teslaStatus = () => {
    return new Promise((resolve) => {
        getVehicle().then(vehicle => {
            getVehicleStatus(vehicle).then(vd => {
                resolve(vd);
            });
        });
    })
}

const checkStatus = async (lastStatus) => {
    const status = await teslaStatus();

    const userBecamePresent = status.vehicle_state.is_user_present && !lastStatus.vehicle_state.is_user_present;

    console.log("User became present: " + userBecamePresent);

    if (userBecamePresent) {
        try {
            const isPlaying = await isUserPlayingMusic();
            console.log("Is playing: " + isPlaying);
            if (isPlaying) {
                await pause(status);
            }
        }
        catch(e)
        {
            console.error(e);
        }
    }

    setTimeout(checkStatus, 1000);
}

console.log("ATTEMPTING TO LISTEN ON PORT " + port);
app.listen(port);

setTimeout(() => checkStatus(), 3000);