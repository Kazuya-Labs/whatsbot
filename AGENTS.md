# AGENTS.md

WhatsApp bot built on Baileys (@whiskeysockets/baileys 7.0.0-rc13, pinned via npm alias). Entrypoint: `index.js` (thin boot → `src/connection/index.js`). ESM (`"type": "module"`), plain `.js` + JSDoc — no TypeScript build step. Runs on plain Node ≥22 (`node --watch` needs ≥18; SQLite via `better-sqlite3` v13 requires ≥22).

## Run
- `npm run dev` — `node --watch index.js` (watch mode, per PRD). `npm start` / `npm test` = plain `node index.js`. No lint/typecheck/test suite exists — the only verification command is `node --check <file>` (see `.agents/rules.md`).
- Fresh session: unregistered creds prompt a phone number, then a pairing code prints to the terminal (`printQRInTerminal: false`). Session lives in `auth_info_baileys/` (gitignored).
- Reconnection is self-managed: `src/connection/update.js` re-calls `start()` up to `reconnect.maxAttempts` (default 3, `reconnect.delayMs` delay; the restart fn is injected as a param to avoid circular imports). On `loggedOut` it stops; delete `auth_info_baileys/` and restart to re-pair.
- Requires Node ≥22 (`node --watch` needs ≥18; better-sqlite3 v13 needs ≥22).

## CLI tools (PRD `.agents/prd.md`)
- `npm run add:plugin -- <name> [--access=<owner|admin|groups|private|all>]` — scaffolds `src/plugins/<access>/<name>.js` (validates name/access, overwrite guard, default access `all`). With pnpm: `pnpm run add:plugin <name> --access=owner`.
- `npm run list:plugin` — prints registered commands + access role + source file (runs the real scanner, offline-safe).
- `npm run db:generate` / `db:migrate` / `db:push` — `drizzle-kit` (schema → `drizzle/` migrations; dev-only tool).

## Structure (`src/`)
- `connection/` — realtime event layer: `index.js` (`start()`: socket + wiring), `update.js` (connection handler), `message.js` (upsert orchestrator), `messageBuilder.js` (serializes every message → `m`, also exported as `serializeMessage`), `parse.js` (command/JID/body parsing), `group.js` (group metadata).
- `plugin/` — plugin engine: `handler.js` (registry + `executeFn` + access checks), `load.js` (normalizes `access` from legacy keys), `register.js` (recursive scanner).
- `plugins/` — feature commands (default export `{ execute, names, access, ... }`), dikelompokkan per access role: `owner/`, `admin/`, `groups/`, `private/`, `all/`.
- `utils/` — shared helpers (`logger`, `datetime`, `general`, `file`, `buttons`, `carousel`, `args`, `jid`, `errors`, `plugin`, `media`). `createPlugin` (`#utils/plugin.js`) wraps `run` dengan try/catch + error reply — pakai di plugin baru; `replyError` tersedia via `m.replyError(error, text)`.
- `storage/` — **SQLite + Drizzle** (PRD): `schema.js`, `db.js` (opens `whatsend.db` via **`better-sqlite3`** (`drizzle-orm/better-sqlite3`) + `runMigrations()`), `campaigns.js` (repository + seed). `drizzle/` holds the drizzle-kit migration SQL (commit it). `autoblast.json` is the one-time seed (imported only when the DB is empty); runtime reads/writes go to SQLite. `whatsend.db*` is gitignored.
- Import aliases in `package.json` `imports`: `#connection/*`, `#plugin/*`, `#plugins/*`, `#utils/*`, `#storage/*` (keep the `.js` extension, e.g. `#utils/logger.js`). Prefer aliases over relative imports.

## Plugin system (`src/plugins/`)
- Registered automatically: `src/plugin/register.js` recursively imports every `.js` under `src/plugins/` (skips `utils/` dirs). Default export must be `{ execute, names: <string[]|string>, ... }`; `names` are command words without prefix.
- Folders = access role: `src/plugins/<access>/`. Plugin tanpa deklarasi `access` di file otomatis diturunkan dari folder tempatnya (`load.js` → `accessFromFile`); deklarasi eksplisit tetap menang.
- Prefixes come from `config.prefixes` (`getCommand` in `src/connection/parse.js` reads live). Command and args arrive as `m.command` / `m.text`.
- **Access roles (PRD)**: `access` key ∈ `owner | admin | groups | private | all`, enforced in `src/plugin/handler.js` (`owner`→isOwner, `admin`→admin||owner, `groups`→isGroup, `private`→!isGroup, `all`→anyone). Legacy keys still work via fallback in `load.js`: `isOwner`/`owner`→`owner`, `isAdmin`→`admin`, `isGroup`→`groups`, else `all`. Non-owners can reach public commands — gate each new command with an explicit `access` (owner-by-default plugins must set `isOwner: true` or `access: "owner"`).
- Owner numbers are configured in `config.json` (`ownerNumbers`), dibaca live via `isOwner` (`#utils/config.js`).
- Owner-only dev backdoor: messages starting with `config.eval.prefix` are `eval()`'d, hanya saat `config.eval.enabled` (`src/connection/message.js`).

## Message object (`m`)
Built per message in `messageBuilder.js`, dispatched by `connection/message.js`. Notable fields: `chat`, `sender`, `fromMe`, `isOwner`, `isGroup`, `isAdmin`, `metadata` (null for non-groups), `body`, `command`, `text` (args after the command), `contentType`, `content`. `m.reply()` quotes by default (pass `{ quoted: false }` to skip); passing a Buffer sends media using `m.mimeType`.

## Data storage
- SQLite via Drizzle (`better-sqlite3` driver, **synchronous**): DB file `src/storage/whatsend.db`. Schema: `campaigns(id, text, footer, jeda, enabled, created_at)`, `campaign_cards(campaign_id FK, position, title, body, image_url, buttons[text JSON])`, `campaign_targets(campaign_id FK, jid, unique(campaign_id, jid))`.
- Migrations: `npm run db:generate` writes SQL to `drizzle/` (commit it); bot auto-applies them at boot (`runMigrations()` via `drizzle-orm/better-sqlite3/migrator`, idempotent — `__drizzle_migrations` table). `drizzle.config.js` maps `schema.js` → `drizzle/`. After editing `schema.js`, run `npm run db:generate` (re-generates from scratch with `rm -rf drizzle` if nothing was applied yet).
- Use the repository (`src/storage/campaigns.js`: `getCampaign`, `listCampaigns`, `createCampaign`, `addTarget`, `removeTarget`, `seedFromJsonIfEmpty`, `initStorage`) — do **not** read/write `autoblast.json` directly (seed only). Campaign shape: `{ id, text, footer, cards[], targets[], jeda, enabled }`.
- `createCampaign` uses `db.transaction` with a **synchronous** body (`.run()` per insert) — the sync driver commits the moment an async body returns, so never `await` inside the transaction callback.
- `config.json` holds runtime config (tracked, gitignored-free). `#utils/config.js` (`getConfig`, `reloadConfig`, `isOwner`, `getPrefixes`) reads it **live** — edit the file and it applies without restart; invalid JSON falls back to defaults (with warn). Keys: `ownerNumbers[]`, `prefixes[]`, `eval{enabled,prefix}`, `messages{owner,admin,groups,private,genericError}`, `bot{name,footer,defaultJeda}`, `reconnect{maxAttempts,delayMs}`, `socket{browser{type,name},connectTimeoutMs,maxMsgRetryCount,keepAliveIntervalMs}`, `pairingPrompt`.

## Docs — trust order
- `.agents/rules.md` — live team conventions: never commit to `main`; branch as `change-type/feature-name` (e.g. `feature/add-login`, `bugfix/...`); run `node --check <file>` before committing.
- `.agents/prd.md` — describes the pnpm-vs-npm CLI (`pnpm run add:plugin`, `list:plugin`) and sqlite/drizzle; the CLI + storage are now implemented as npm scripts + SQLite/Drizzle (see above). pnpm itself is not installed; command names work with `npm`.