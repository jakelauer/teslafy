const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const {socketLog} = require("./socketlog");
const fs = require("fs");
const path = require("path");
const {isUserPlayingMusic, teslaStatus, checkAndTryPause, refreshSpotifyTokens, spotifyClient} = require("./engine");
const {socketMessages} = require("./socketlog");

const app = express();
const port = process.env.port || process.env.PORT || 9988;
app.use(compression());
app.use(cookieParser());
app.use(
	bodyParser.json({
		type: ["application/json", "text/plain"],
	})
);
app.use(bodyParser.urlencoded({extended: true}));

app.get("/start", (req, res) => {
	const authorizeUrl = spotifyClient.createAuthorizeURL([
		"user-read-currently-playing",
		"user-read-playback-state",
	]);

	res.redirect(authorizeUrl);

	checkAndTryPause();
});

app.get("/auth", (req, res) => {
	const authCode = req.query.code;

	spotifyClient.authorizationCodeGrant(authCode).then((data) => {
		spotifyClient.setAccessToken(data.body["access_token"]);
		spotifyClient.setRefreshToken(data.body["refresh_token"]);

		refreshSpotifyTokens().then(() => res.redirect("/"));
	});
});

app.get("/status", async (req, res) => {
	if (!spotifyClient.getRefreshToken())
	{
		res.redirect("/");
		return;
	}

	let code = (await isUserPlayingMusic()) ? 200 : 500;

	res.status(code).send("");
});

app.get("/", (req, res) => {
	if (!spotifyClient.getRefreshToken())
	{
		res.redirect("/start");
		return;
	}

	const html = fs.readFileSync(path.join(__dirname, "./index.html"), "utf-8");
	const messagesRendered = socketMessages.map((m) => `<div>${m}</div>`);

	const rendered = html.replace(
		`<pre id="messagebox"></pre>`,
		`<pre id="messagebox">${messagesRendered.join("")}</pre>`
	);

	res.send(rendered);
});

app.get("/car", async (req, res) => {
	const state = await teslaStatus();

	res.send(state);
});

app.get("/messages", async (req, res) => {
	res.send(socketMessages);
});

socketLog("ATTEMPTING TO LISTEN ON PORT " + port + ". Go to / to start");
app.listen(port);