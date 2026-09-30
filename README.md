# StreamHub TV — Final Android TV / Vercel Edition

## Included
Home, Continue Watching, Recently Added, Popular, Trending, Recommended, category shelves with horizontal carousels and See All, Live TV filters, favorites, recently watched, country/language/genre filters, search, channel-number jump, EPG, HLS/DASH/MP4/embed playback, quality/audio/subtitle/aspect/speed controls, automatic reconnect, previous/next and Channel Up/Down, D-pad focus navigation, settings, local admin, reports, optional browser SQLite (sql.js) with localStorage fallback, and optional MongoDB persistence.

## Vercel
Import the `streamhub-tv` folder. Framework: Other. No build command or output directory is required.

Optional environment variables:
- `MONGODB_URI`
- `MONGODB_DB` (default: streamhub)
- `ADMIN_KEY`

Without MongoDB the app still runs fully using browser-local storage / optional SQLite cache. MongoDB is only used when `MONGODB_URI` is present.

## HTTP HLS
The included proxy only permits `livetv.akr4m.com` and rewrites HLS playlist URLs. Add another upstream host explicitly in `api/proxy.js` if you control/are authorized to proxy it.
