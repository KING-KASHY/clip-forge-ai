# ClipForge AI — browser-based MVP

This is a free, static website project. It requires no build tools, API key, account system, database, or server.

## Run locally
Open `index.html` in a current desktop browser (Chrome or Edge recommended). For best file/media behavior, serve this folder from a local static server or publish it to GitHub Pages.

## Publish free with GitHub Pages
1. Create a new GitHub repository.
2. Upload the contents of this folder (the files `index.html`, `style.css`, `app.js`, and `README.md`; do not upload only the ZIP).
3. In the repository, open **Settings → Pages**.
4. Under build/deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
5. Wait for GitHub Pages to publish the site. GitHub will show the public URL in the Pages settings.

## Important scope and limitations
This MVP is not yet a fully autonomous AI editor. It creates five draft segments at evenly distributed points in the video, allows source preview, lets users edit caption/narration text, uses the browser's text-to-speech voices, and attempts to export vertical/square/landscape WebM clips locally.

It does **not** currently perform AI highlight detection, automatic speech-to-text transcription, automatic hook/title/hashtag generation, cloud voice cloning, background music selection, or guaranteed MP4 export. Browser speech voices vary by device. The captions/narration are based on text the user supplies; they are not automatically transcribed from the video's audio.

A true "upload any video → AI finds the best moments → captions + narrator + finished five exports" service requires substantial video processing and speech/AI models. If those run on a server, ongoing compute/API costs and secure upload handling are required; if they run in-browser, model downloads can be very large and support varies. Do not advertise this prototype as fully AI-powered until those systems have actually been integrated and tested.

## Privacy
This version creates a local object URL for the chosen video and does not send the file to a remote server. Publishing the static website does not change that behavior.
