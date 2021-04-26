const SpotifyWebApi = require("spotify-web-api-node");
const {getVehicleStatus} = require("./vehicle");
const {getVehicle} = require("./vehicle");
const {socketError} = require("./socketlog");
const {pause} = require("./vehicle");
const {socketLog} = require("./socketlog");
const {prefs} = require("./electron");

const spotifyClientId = prefs.value("Settings.spotifyClientId");
const spotifyClientSecret = prefs.value("Settings.spotifyClientSecret");
const port = prefs.value("Settings.port");
const redirectUri = `http://localhost:${port}/auth`;

console.log(spotifyClientId, spotifyClientSecret, port, redirectUri);
const spotifyClient = new SpotifyWebApi({
	clientId: spotifyClientId,
	clientSecret: spotifyClientSecret,
	redirectUri
});

let musicError = null;

const isUserPlayingMusic = async () => {
	if (!spotifyClient.getRefreshToken())
	{
		return false;
	}

	let playing = false;
	try
	{
		const state = await spotifyClient.getMyCurrentPlaybackState();
		if (state.body.is_playing)
		{
			playing = true;
		}
		musicError = null;
	} catch (e)
	{
		musicError = e;
		console.error(e);
	}

	return playing;
};

const refreshSpotifyTokens = () => {
	socketLog("Refreshing Spotify access token");
	return spotifyClient.refreshAccessToken().then((data) => {
		socketLog("The Spotify access token has been refreshed!");

		spotifyClient.setAccessToken(data.body["access_token"]);

		setTimeout(refreshSpotifyTokens, 1000 * 60 * 15);
	});
};

const teslaStatus = async () => {
	return new Promise(async (resolve, reject) => {
		try
		{
			const vehicle = await getVehicle();
			if (!vehicle)
			{
				reject("Cannot get vehicle");
			}
			else
			{
				const vehicleData = await getVehicleStatus(vehicle);
				if (vehicleData)
				{
					resolve(vehicleData);
				}
				else
				{
					reject("Cannot get vehicle data");
				}
			}
		} catch (e)
		{
			socketLog("FAILED VEHICLE");
			socketError(e);
			reject(e);
		}
	});
};

let lastDetectedPlaying = 0;
let lastDetectedUser = 0;
let lastTookAction = 0;
let checkTimeout = 0;
const checkAndTryPause = async (lastStatus) => {
	let status;
	clearTimeout(checkTimeout);

	try
	{
		status = await teslaStatus();
		const isPlaying = await isUserPlayingMusic();

		const userBecamePresent =
			(status && status.vehicle_state && status.vehicle_state.is_user_present) &&
			(lastStatus && !lastStatus.vehicle_state.is_user_present);

		const now = Date.now();

		if (isPlaying)
		{
			lastDetectedPlaying = now;
		}

		if (userBecamePresent)
		{
			lastDetectedUser = now;
		}

		if (lastDetectedUser > 0 && lastDetectedPlaying > 0)
		{
			const timeSinceLastDetectedPlaying = now - lastDetectedPlaying;
			const timeSinceLastDetectedUser = now - lastDetectedUser;
			const timeSinceLastTookAction = now - lastTookAction;

			const withinDelta = timeSinceLastDetectedPlaying < 3000 && timeSinceLastDetectedUser < 3000;
			socketLog({
				timeSinceLastDetectedPlaying,
				timeSinceLastDetectedUser,
				timeSinceLastTookAction,
				shouldPause: withinDelta && timeSinceLastTookAction > 20 * 1000
			});

			if (withinDelta && timeSinceLastTookAction > 20 * 1000)
			{
				const prettyLastAction = (timeSinceLastTookAction / 1000).toFixed(2);
				lastTookAction = now;

				socketLog(`Detected pausable. Last action taken was ${prettyLastAction} seconds ago. Pausing!`);

				await pause(status);
			}
		}
		else
		{
			socketLog("Music is not playing and/or user is not present.");
		}
	} catch (e)
	{
		socketError(e);
	}

	checkTimeout = setTimeout(() => checkAndTryPause(status), 500);
};

module.exports = {
	checkAndTryPause,
	isUserPlayingMusic,
	teslaStatus,
	refreshSpotifyTokens,
	spotifyClient
}