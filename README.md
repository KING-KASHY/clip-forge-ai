# ClipForge Studio

A no-cost, browser-based video clip editor starter project. No account, server, API key, or paid hosting is required for the core workflow.

## Features
- Load a local video file by file picker or drag-and-drop.
- Generate 3, 5, or 7 editable candidate segments.
- Choose a vertical 9:16, square 1:1, or original-proportion canvas.
- Edit clip start/end times, title hook, caption overlay, and caption style.
- Preview segments and export each as an individual WebM video file in the browser.
- Video processing stays on your device.

## Important limitations
- The candidate generator evenly spaces segments across the video's duration. It does **not** use AI to understand the content or find viral moments.
- A YouTube URL opens the video on YouTube; it does not download or extract video. Browser security and platform restrictions prevent a static website from reliably editing a YouTube URL directly. Use a video file you own or have permission to edit.
- Captions are user-entered overlays. Speech transcription, automatic word-timed subtitles, AI narration, and genuine AI highlight detection are not included because those require additional models/services or integrations.
- Export uses the browser's MediaRecorder API and produces WebM. Best support is generally in current Chrome or Edge. Long/high-resolution clips may use substantial memory.
- The exported video is rendered in real time, so keep the page open until the download starts.

## Run locally
1. Unzip the project.
2. Open `index.html` in a current Chrome or Edge browser.
3. Upload a local video file, choose settings, generate candidates, select a clip, edit it, then export.

No installation step is required.

## Publish for free with GitHub Pages
1. Create a GitHub repository.
2. Upload `index.html`, `app.js`, `style.css`, and optionally `README.md` to the repository root.
3. In the repository, open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/(root)`, then save.
5. Wait for GitHub Pages to publish the site.

GitHub Pages is static hosting; it does not add AI video processing or bypass YouTube restrictions.
