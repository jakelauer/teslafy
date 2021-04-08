const SpotifyWebApi = require("spotify-web-api-node");
const {spotifyClientId, spotifyClientSecret, spotifyRedirectUrl} = require("./secrets");
const {getVehicleStatus} = require("./vehicle");
const {getVehicle} = require("./vehicle");
const {socketError} = require("./socketlog");
const {pause} = require("./vehicle");
const {socketLog} = require("./socketlog");

const spotifyClient = new SpotifyWebApi({
	clientId: spotifyClientId,
	clientSecret: spotifyClientSecret,
	redirectUri: spotifyRedirectUrl
});

const isUserPlayingMusic = async () => {
	if (!spotifyClient.getRefreshToken())
	{
		socketError("Visit /start to initialize Spotify");

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
	} catch (e)
	{
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
const checkAndTryPause = async (lastStatus) => {
	let status;
	try
	{
		status = await teslaStatus();
		const isPlaying = await isUserPlayingMusic();

		const userBecamePresent =
			(status && status.vehicle_state && status.vehicle_state.is_user_present) &&
			(!lastStatus || !lastStatus.vehicle_state.is_user_present);

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

			const delta = Math.abs(timeSinceLastDetectedPlaying - timeSinceLastDetectedUser);
			socketLog({
				timeSinceLastDetectedPlaying,
				timeSinceLastDetectedUser,
				timeSinceLastTookAction,
				delta
			});

			if (delta < 3000 && timeSinceLastTookAction > 20 * 1000)
			{
				const prettyLastAction = (timeSinceLastTookAction / 1000).toFixed(2);
				lastTookAction = now;

				socketLog(`Detected pausable. Delta between detected events was ${delta}. Last action taken was ${prettyLastAction} seconds ago. Pausing!`);
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

	if (!spotifyClient.getRefreshToken())
	{
		socketError("Visit /start to initialize Spotify");
	}
	else
	{
		setTimeout(() => checkAndTryPause(status), 500);
	}
};

module.exports = {
	checkAndTryPause,
	isUserPlayingMusic,
	teslaStatus,
	refreshSpotifyTokens,
	spotifyClient
}