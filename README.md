# StreamHub TV — Vercel + Android TV

## Deploy
Import this folder into Vercel. No build command is required.

- Framework: Other
- Build Command: empty
- Output Directory: empty

## Pages
- /home
- /channels
- /play?id=CHANNEL_ID

## Android TV
The UI uses large focusable cards, horizontal shelves and D-pad left/right/up/down navigation. Press OK/Enter on a focused channel to open the Play page.

## HTTP HLS
The included Vercel Edge proxy only permits `livetv.akr4m.com` and rewrites HLS playlist URLs so an HTTP source can be consumed from the HTTPS site.
