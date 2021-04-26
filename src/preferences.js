const electron = require('electron');
const app = electron.app;
const path = require('path');
const os = require('os');
const ElectronPreferences = require('electron-preferences');

const userDataPath = path.resolve(app.getPath('userData'), 'teslafy_preferences.json');
console.log("User data stored at " + userDataPath);

const prefs = new ElectronPreferences({
	dataStore: userDataPath,
	defaults: {
		Settings: {
			teslaUsername: "",
			spotifyClientId: "",
			spotifyClientSecret: "",
			port: 9988
		}
	},
	sections: [{
		id: "Settings",
		label: "Settings",
		form: {
			groups: [{
				label: "Settings",
				fields: [
					{
						label: "Tesla Username",
						key: "teslaUsername",
						type: "text"
					},
					{
						label: "Port (defaults to 9988)",
						key: "port",
						type: "text"
					},
					{
						content: 'To get the below values, create an app at https://developer.spotify.com/dashboard and copy the client ID and client secret into the fields',
						type: "message",
						key: "nothing",
					},
					{
						label: "Spotify Client ID",
						key: "spotifyClientId",
						type: "text",
					},
					{
						label: "Spotify Client Secret",
						key: "spotifyClientSecret",
						type: "text",
					}
				]
			}]
		}
	}]
})

module.exports = {
	prefs
}