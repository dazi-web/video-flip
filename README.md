# Video Flip

Chrome extension that adds a button to flip videos horizontally — directly in the Google Drive preview and on YouTube.

## Features

- Adds a small 🪞 button to videos on `drive.google.com` and `youtube.com`
- One click flips the video horizontally, another click undoes it
- Only runs on the sites listed above — no effect on any other website
- No data collection, no external servers, no tracking (see [privacy-policy.txt](./privacy-policy.txt))

## Installation (developer mode)

1. Clone this repository or download it as a ZIP
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** in the top right
4. Click **Load unpacked** and select the project folder (`video-flip/`)
5. Open a video on Google Drive or YouTube — the 🪞 button appears automatically

## How it works

Google Drive doesn't play videos itself in its preview; it embeds them via a YouTube embed player inside an iframe. Since Drive places a transparent click layer over that iframe, a button inside the iframe can't be clicked. Video Flip therefore renders the button in the parent window (on `drive.google.com`) and communicates with the embedded player via `postMessage` to flip the video there. On YouTube itself (`youtube.com`) this issue doesn't exist, so the button flips the video directly.

## Permissions

The extension only runs on:

- `drive.google.com` — to show the button in the video preview
- `youtube.com` (including `www.` and `m.`) — to show the button directly on YouTube
- `youtube.googleapis.com` — the embed player Google Drive uses internally

No other permissions, no access to any other sites or browser data.

## License

[MIT](./LICENSE)
