const { app: electronApp, BrowserWindow, Menu, Tray} = require("electron");
const path = require('path');
const prefs = require("./preferences").prefs;

const gotTheLock = electronApp.requestSingleInstanceLock()

if (!gotTheLock) {
	electronApp.quit()
}

const restart = () => {
	electronApp.exit();
	electronApp.relaunch();
}

let appIcon = null;
const start = () => {
	const doStart = (window) => {
		const teslaUsername = prefs.value("Settings.teslaUsername");
		const spotifyClientId = prefs.value("Settings.spotifyClientId");
		const spotifyClientSecret = prefs.value("Settings.spotifyClientSecret");
		const port = prefs.value("Settings.port");

		if(!port || !teslaUsername || !spotifyClientId || !spotifyClientSecret)
		{
			prefs.show();
			let x = setInterval(() => prefs.save(), 250);
			prefs.prefsWindow.on("closed", () => {
				restart()
			});
		}
		else
		{
			window.loadURL(`http://localhost:${port}/start`)
		}
	}

	function createWindow()
	{
		const win = new BrowserWindow({
			width: 800,
			height: 600,
			webPreferences: {
				preload: path.join(__dirname, 'preload.js')
			}
		});

		const menu = Menu.buildFromTemplate([
			{
				label: "Settings",
				click: () => prefs.show()
			},
			{
				label: "Quit",
				click: () => {
					electronApp.isQuitting = true;
					electronApp.quit();
					electronApp.exit();
				}
			}
		])

		Menu.setApplicationMenu(menu);

		import("./server.js").then(() => {
			setTimeout(() => doStart(win), 500);
		})

		win.on('minimize',function(event){
			event.preventDefault();
			win.hide();
		});

		win.on('close', function (event) {
			if(!electronApp.isQuitting){
				event.preventDefault();
				win.hide();
			}

			return false;
		});

		var contextMenu = Menu.buildFromTemplate([
			{ label: 'Show App', click:  function(){
					win.show();
				} },
			{ label: 'Quit', click:  function(){
					electronApp.isQuitting = true;
					electronApp.quit();
					electronApp.exit();
				} }
		]);

		appIcon = new Tray(path.join(__dirname, "icon.png"));
		appIcon.setContextMenu(contextMenu);
	}

	electronApp.whenReady().then(() => {
		createWindow()

		electronApp.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0)
			{
				createWindow()
			}
		})
	})

	electronApp.on('window-all-closed', () => {
		if (process.platform !== 'darwin')
		{
			electronApp.quit()
		}
	})
}

module.exports = {
	start,
	electronApp,
	restart,
	prefs
}