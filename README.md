# League LCU One-Page Demo

Single-page site with a minimal Node server that:

- Reads the League lockfile from default Windows install paths
- Authenticates to the local LCU with HTTPS Basic auth
- Exposes endpoints for current summoner and challenges
- Serves a lightweight frontend to fetch and display the data

## Prerequisites

- Windows with League of Legends installed
- Node.js 18+
- League client running (so the lockfile exists)

## Install & Run

Using Yarn (preferred):

```powershell
yarn start
```

Then open `http://localhost:5173`.

> Note: There are no external dependencies; this uses Node built-ins.

## How it works

- The server searches common default paths:
  - `C:/Riot Games/League of Legends/lockfile`
  - `C:/Program Files/Riot Games/League of Legends/lockfile`
  - `C:/Program Files (x86)/Riot Games/League of Legends/lockfile`
- It parses the lockfile (`name:pid:port:password:protocol`).
- Requests are sent to the local LCU (`https://127.0.0.1:<port>`), skipping TLS verification, authenticated via `Authorization: Basic <base64("riot:password")>`.

## API

- `GET /api/summoner` → `/lol-summoner/v1/current-summoner`
- `GET /api/challenges` → `/lol-challenges/v1/challenges/local-player`

## Notes

- If you installed League in a custom directory, update `DEFAULT_LOCKFILE_PATHS` inside `server.js` or add logic to discover the install path.
- The TLS certificate is self-signed by the client; we disable verification for local requests.


