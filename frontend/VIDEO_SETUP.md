# Add your Tanzania showcase video

The homepage video player reads this file by default:

`frontend/public/videos/tanzania-showreel.mp4`

To use your own film, create `frontend/public/videos` if it does not exist and copy your MP4 file there using that exact name. You can replace the file later without changing React code.

PowerShell example (replace the source path with the location of your video):

```powershell
$Project = "$HOME\Documents\leonard-tour"
New-Item -ItemType Directory -Force -Path "$Project\frontend\public\videos" | Out-Null
Copy-Item "C:\path\to\your-tanzania-video.mp4" "$Project\frontend\public\videos\tanzania-showreel.mp4" -Force
```

Use an H.264 MP4 file for the broadest browser compatibility. Keep the video reasonably optimized for web streaming.

You may also set `VITE_TANZANIA_VIDEO_URL` in `frontend/.env.local` to a publicly accessible MP4 URL. Restart the Vite dev server after changing that environment value.
