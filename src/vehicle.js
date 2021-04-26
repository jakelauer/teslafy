const tjs = require("teslajs");
const {prefs} = require("./preferences");
const {socketLog} = require("./socketlog");
const {socketError} = require("./socketlog");
const prompt = require("electron-prompt")

let vehicle;
let authToken;

if (typeof localStorage === "undefined" || localStorage === null)
{
	const LocalStorage = require('node-localstorage').LocalStorage;
	localStorage = new LocalStorage('./scratch');
}

const lsKey = "LOGIN_INFO";

const storeNewData = (result) => {
	const now = Date.now();

	const data = {
		timestamp: now,
		data: result
	};

	localStorage.setItem(lsKey, JSON.stringify(data));

	return data;
}

const getLoginFromTeslaOrCached = () => {
	return new Promise((resolve, reject) => {
		const fromLs = localStorage.getItem(lsKey);
		let data = fromLs ? JSON.parse(fromLs) : null;
		if (data)
		{
			const ts = data.timestamp;
			const now = Date.now();
			const isOld = now - ts > (1000 * 60 * 60 * 24);
			if (isOld)
			{
				socketLog("Found data in localstorage, but it was old");
				tjs.refreshToken(data.data.refreshToken, (err, result) => {
					if (!err)
					{
						data = storeNewData(result);

						resolve(data);
					}
					else
					{
						socketError("Couldn't refresh token");
						socketError(err);
						localStorage.removeItem(lsKey);
						reject(err);
					}
				});
			}
			else
			{
				socketLog("Found data in localstorage");
				resolve(data);
			}
		}
		else
		{
			const username = prefs.value("Settings.teslaUsername");
			prompt({
				title: "Tesla Login",
				label: "Password:",
				value: "",
				inputAttrs: {
					type: "password"
				}
			}).then(pw => {
				socketLog("LOGGING IN FOR REAL");
				tjs.login({
					username: username,
					password: pw,
				}, (err, result) => {
					if (err)
					{
						socketLog("Failed to login");
						reject(err)
					}

					data = storeNewData(result);

					resolve(data);
				});
			})
		}
	})
}

const init = async () => {
	return new Promise((resolve, reject) => {
		socketLog("Fetching login info");
		getLoginFromTeslaOrCached().then(data => {
			const result = data.data;
			socketLog("Logged in!");
			authToken = result.authToken;
			tjs.vehicle({
				authToken
			}, (err2, vh) => {
				socketLog("received vehicle response!");
				if (!err2)
				{
					vehicle = vh;
					resolve(vehicle);
				}
				else
				{
					socketError(err2);
					reject(err2)
				}
			});
		}).catch(reject);
	});
}

const getVehicle = async () => {
	try
	{
		return vehicle || await init();
	} catch (e)
	{
		socketError(e);
	}
}

const getVehicleStatus = async (vehicle) => {
	return new Promise((resolve, reject) => {
		tjs.vehicleData({
			authToken: authToken,
			vehicleID: vehicle.id
		}, (err, vd) => {
			if (err)
			{
				reject(err);
			}
			else if (vd)
			{
				resolve(vd);
			}
			else
			{
				reject("Request succeeded but got no data")
			}
		})
	})
}

const pause = () => {
	return new Promise((resolve, reject) => {
		getVehicle().then(vehicle => {
			tjs.mediaTogglePlayback({
				authToken: authToken,
				vehicleID: vehicle.id
			}, () => {
				socketLog("Toggling play/pause")
				resolve();
			});
		})
	})
};

module.exports = {
	getVehicle,
	getVehicleStatus,
	pause
}