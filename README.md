# StreamHub IPTV — Vercel Ready

## Deploy
1. Upload this folder to GitHub.
2. Import the repository into Vercel.
3. Framework Preset: Other.
4. Build Command: leave empty.
5. Output Directory: leave empty.
6. Deploy.

The project uses `/home`, `/channels`, and `/play?id=...` routes. `vercel.json` rewrites those routes to the SPA entry point.

## HTTPS HLS proxy
`api/proxy.js` proxies only `livetv.akr4m.com`. It rewrites HLS playlists, including relative segment/key/map URLs, back through the HTTPS proxy.

To add another upstream, add its hostname to `ALLOWED_HOSTS` in `api/proxy.js`.

## Important
The proxy does not defeat DRM, authentication, expired tokens, geo-blocking, or an offline upstream. It only solves browser mixed-content/CORS-style delivery when the upstream is reachable by the Vercel function.
