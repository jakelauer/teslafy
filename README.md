# Teslafy

I wrote this little Node.js webservice so that I could automatically pause Spotify in my Tesla Model Y when it autoplays and I get in the car.

This script polls the Spotify and Tesla APIs and detects the situation in question this way:
- Check if user is playing music on Spotify
- Check if user is detected by the car
- If (time_music_detected) and (time_user_detected) are less than 3 seconds apart, then (pause).

# How to use
- Clone the repo
- Create a Spotify app at  https://developer.spotify.com/dashboard/applications
- Add a redirect URL that matches the domain you'll host this at in the Spotify app's settings. It should be "http://your.domain/auth".
- Note the client ID and secret of your Spotify app
- Create a `src/secrets.js` file that exports looks like this:
```javascript
module.exports = {
	teslaUsername: "your_tesla@username",
	teslaPassword: "your_tesla_password",
	spotifyClientId: "your_spotify_client_id",
	spotifyClientSecret: "your_spotify_client_secret",
	spotifyRedirectUrl: "http://your.domain/auth"
}
```
- Run using `npm run start`. You can also use `npm run stop` and `npm run restart`