# Teslafy

I wrote this little Electron application so that I could automatically pause Spotify in my Tesla Model Y when it autoplays and I get in the car.

This polls the Spotify and Tesla APIs and detects the situation in question this way:
- Check if user is playing music on Spotify
- Check if user is detected by the car
- If (time_music_detected) and (time_user_detected) are less than 3 seconds apart, then (pause).

# How to use
- Head to https://github.com/jakelauer/teslafy/releases and download the most recent package
- Unzip it somewhere (maybe Program Files?)
- Run "Teslafy.exe" in the unzipped file
- The application will prompt you for your Tesla account username, as well as a Spotify app client ID and secret. Upon providing those, close the settings window and everything should start working.

# How do I get a Spotify client ID and secret?
- Follow instructions here: http://support.heateor.com/get-spotify-client-id-client-secret/
