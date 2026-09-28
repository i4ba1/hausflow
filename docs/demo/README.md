# HausFlow demo capture

The [animated demo](hausflow-demo.gif) and screenshots below were captured from the running production build on 2026-09-28. They show the credential-free public preview. The authenticated maintenance and CSV workflows require Clerk and Convex configuration and are not represented as live in this capture.

| Screen                           | Screenshot                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| Inbox: recurring heating request | [01-inbox-heating.png](screenshots/01-inbox-heating.png)     |
| Inbox: water leak                | [02-inbox-water.png](screenshots/02-inbox-water.png)         |
| Inbox: entrance access           | [03-inbox-access.png](screenshots/03-inbox-access.png)       |
| Search: no results               | [04-search-empty.png](screenshots/04-search-empty.png)       |
| Search: heating request          | [05-search-heating.png](screenshots/05-search-heating.png)   |
| Properties                       | [06-properties.png](screenshots/06-properties.png)           |
| Activity placeholder             | [07-activity.png](screenshots/07-activity.png)               |
| Import setup                     | [08-imports.png](screenshots/08-imports.png)                 |
| Settings                         | [09-settings.png](screenshots/09-settings.png)               |
| Connected workspace setup        | [10-workspace-setup.png](screenshots/10-workspace-setup.png) |
| Mobile inbox                     | [11-mobile-inbox.png](screenshots/11-mobile-inbox.png)       |

To recapture, start the production server with `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100`, then run `node scripts/capture-demo.mjs` and `python scripts/build-demo-gif.py`. Override the capture URL with `DEMO_BASE_URL` if needed. The GIF builder requires Pillow.
