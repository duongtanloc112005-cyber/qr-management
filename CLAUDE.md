# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

QR Management System — a Vietnamese-language production-tracking app for a garment workshop. The project, comments, UI labels, and most documentation are in Vietnamese. Module names are Vietnamese without diacritics (e.g. `khophoi` = "Kho phôi" / fabric warehouse). Match this convention when adding code.

## Common commands

```bash
# Run the LAN server (port 3000) — main entry point
npm start                       # node sync-server.js
npm run dev                     # nodemon sync-server.js

# Run the Internet-exposed server (port 8080)
node sync-server-external.js
# or via batch script:
scripts\start-server-port-8080.bat

# Data tooling (CLI subcommands; no interactive prompts when arg passed)
node data-manager.js stats      # data + backup statistics
node data-manager.js backup     # create backup
node data-manager.js list       # list backups
node data-manager.js restore    # restore from a backup
node data-manager.js cleanup    # manual old-data cleanup
node data-manager.js safety     # integrity check
node data-manager.js clear      # DESTRUCTIVE — wipe all data
# also: clean, files, config

# One-time migrations
node migrate-passwords.js       # plaintext users.json -> bcrypt
node migrate-to-database.js     # JSON files in ./data -> SQLite

# Generate stress-test data
node generate-test-data.js      # writes 5000 fake records into ./data
```

There is no test runner, linter, or build step configured. `npm test` is not defined. `test-*.js` files are ad-hoc scripts run directly with `node`.

## Architecture

### Two server entry points

- `sync-server.js` — primary LAN server, port 3000. Wires up Express + WebSocket + auth + REST + SQLite/JSON persistence.
- `sync-server-external.js` — variant that exposes the same flows for external/Internet access on port 8080. **The two files have drifted**: `sync-server-external.js` does not require `data-config`/`auth-server`/`logger`/`database` the same way. If you change behavior in one, check whether the other needs the same change.

### Storage: dual-mode (SQLite or JSON)

`data-config.js` flag `USE_DATABASE` controls the mode:

- `true` (default) → `database.js` (better-sqlite3, WAL mode, per-module tables, `maGoc` UNIQUE index). Runtime data lives in `./data/qr_management.db`.
- `false` → JSON files at `./data/<module>.json` with shape `{ timestamp, data: [...] }`.

Writes use a temp-file-then-rename pattern for atomicity. The runtime keeps an in-memory `syncData` map of all modules and persists periodically (`AUTO_SAVE_INTERVAL`, default 3 s).

When loading, `loadDataFromFile` falls back from the main file to a `.tmp` sibling if the main file is corrupt — do not delete `.tmp` files in `./data`.

### Module set + production flow

The eight modules are defined in `auth-server.js` (`MODULE_ROLE_MAP`) and partially in `data-config.js` (`MODULES`):

`donghang, khophoi, sanxuat, thanhpham, hangsan, hangton, tonghop, donhang`

These are not symmetric:
- `data-config.js MODULES` only lists the four core production modules.
- `database.js createTables` creates tables for six (no `tonghop`/`donhang`).
- `sync-server.js syncData` and `connections` initially declare only four; other modules are referenced piecemeal.
- `sync-server-external.js DATA_FILES` includes all eight.

When adding a new module, audit each of: `MODULE_ROLE_MAP`, `data-config.MODULES`, `database.createTables`, `syncData`, `connections`, `DATA_FILES`, the auth Joi schema in `sync-server.js`, and the HTML page in `html/`.

The four-step production chain (`productionFlow` in `sync-server.js`) is `khophoi → sanxuat → thanhpham → donghang`. `forwardSyncMap`/`reverseSyncMap` encode adjacent-step relations (auto-status logic that fires "ĐÃ XÓA" comments mark removed previously — be careful before re-introducing it).

### WebSocket protocol

Server message types handled in `wss.on('connection')` in `sync-server.js` (~line 533):

- `register` — client subscribes to a module; server replies with current data (chunked if > 5000 items).
- `update` — client sends an array `payload`; server validates a sample, replaces `syncData[module]`, persists, and broadcasts to other clients in the same module.
- `get_data`, `get_stats`, `ping`, `cleanup_data`, `clear_all_data`.
- `check_missing` — kept as a no-op (returns `isMissing: false`) for backward compatibility with old clients.

Large payloads use chunked transfer (`CHUNK_SIZE = 5000`, `CHUNK_DELAY = 50 ms`) and `optimizeDataForTransmission` strips fields like `lichSu` to reduce bandwidth. Compression is enabled (`perMessageDeflate`).

### REST API

`api-routes.js` mounts `/api/modules/:module` (CRUD + pagination). `sync-server.js` mounts `/api/auth/login` and `/api/auth/check`. Both are rate-limited (`apiLimiter` 100/15min, `authLimiter` 5/15min). API responses cache for 5 s in an in-memory Map; cache is invalidated via `clearModuleCache(module)` on writes — call this whenever `syncData[module]` changes.

### Auth model

- `users.json` (gitignored from the perspective of secrets) holds bcrypt-hashed passwords. Plaintext passwords are still accepted as a fallback when the stored value is shorter than 60 chars (see `verifyPassword` in `auth-server.js`); after running `migrate-passwords.js` everything should be hashed.
- `MODULE_ROLE_MAP` in `auth-server.js` and `auth.js` (client) must stay in sync.
- The `tonghop` module (admin/dashboard) requires `role === 'admin'` strictly. Other modules currently allow any authenticated user (the role-mismatch check is commented out — read the comment in `auth-server.js` before tightening it).
- Sessions: client-side, `tonghop` uses `sessionStorage` (cleared on tab close); other modules use `localStorage` with a 24 h TTL.

### Static HTML serving

The Express static handler serves the project root (`express.static('.')`), but a custom `app.get('/*.html', ...)` rewrites HTML requests to look up files in `./html/`. Add new pages under `html/`, not the root.

### Logging

Winston is configured in `logger.js`. Files: `./logs/error.log` (errors only) and `./logs/combined.log` (all). Console output is enabled when `NODE_ENV !== 'production'`. Use `logger.info/warn/error` rather than `console.log` in new server-side code.

### Backups

`backup-data.js` copies the four core JSON files (`donghang/khophoi/sanxuat/thanhpham`) into `./backups/backup-<timestamp>/`. **`hangsan`, `hangton`, `tonghop`, `donhang` are not currently backed up** — extend `dataFiles` in `createBackup` if you need them. `MAX_BACKUPS = 10`; older backups are pruned automatically. Backups also fire `2 s` after every WebSocket `update` and on a 30-min interval.

## Conventions and gotchas

- **Vietnamese**: keep new comments, log messages, and UI strings in Vietnamese to match the codebase. Use ASCII module names without diacritics in code paths.
- **Status enum** (`productSchema.trangThai` in `sync-server.js`): `'Bàn giao' | 'In & thêu' | 'Hoàn thiện'` are the active values per stage; the others (`'Đang xử lý'`, `'Đợi file'`, `'Thiếu hàng'`, `'Xử lý lỗi'`, `'Hoàn thành'`, `'Nhận hàng'`) are kept for backward compatibility.
- **`maGoc` is the primary key** for products across all modules and is `UNIQUE` in SQLite.
- **Async file writes for large data** (>5000 items) — `saveDataToFile` returns immediately after kicking off `fs.writeFile`. Do not assume the file is on disk after the call returns.
- **Index cache** (`productIndex`, `indexDirty`): when you mutate `syncData[module]`, call `markIndexDirty(module)` so `findProductFast` rebuilds lazily. Otherwise lookups return stale indexes.
- **Many `*.md` files in the root** are historical Vietnamese reports (`BAO-CAO-*`, `KET-QUA-*`, `SUA-*`, `TOI-UU-*`, `HUONG-DAN-*`, etc.). They are reference material, not authoritative spec. Prefer the code as the source of truth.
- **Process exit handlers** (`SIGINT`/`SIGTERM`/`uncaughtException`/`unhandledRejection`) all call `saveAllData()` before exit. Don't add long-running async work in shutdown paths without awaiting it explicitly.
