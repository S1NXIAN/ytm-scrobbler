# ytm-scrobbler

Scrobble YouTube Music to Last.fm — Chrome MV3 extension.

## Setup

Load the extension in Chrome:
1. Navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

## Usage

1. Open [music.youtube.com](https://music.youtube.com) and play a song
2. Click the extension icon → **Authorize with Last.fm**
3. Adjust the scrobble threshold using the slider (default: 50%)

On repeat, the extension re-scrobbles when the track loops past the threshold.

## Use your own API application

Replace the API key and secret in `src/background.js` and `src/popup.js` with credentials from your own [Last.fm API application](https://www.last.fm/api/account/create).
