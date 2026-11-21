# Leonard Tour — React frontend

## Local development

```powershell
npm.cmd ci
Copy-Item .env.example .env.local
npm.cmd run dev
```

Open `http://localhost:5173`.

## Cloudflare Pages production build

Set the Pages project root directory to `frontend`, build command to `npm run build`, and output directory to `dist`. Set `VITE_API_BASE_URL` to the public HTTPS API origin, for example `https://api.example.com`. Set optional `VITE_TANZANIA_VIDEO_URL` to an approved, hosted hero video.

The `public/_redirects` file keeps React routes working when Pages is configured as a static SPA.

Use approved company-owned or licensed safari, mountain and island photography before public launch. The current source has some remote preview-image URLs and the supplied ZIP did not include the legacy package image files.
