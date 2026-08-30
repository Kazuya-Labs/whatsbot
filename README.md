# Whatsend — WhatsApp Bot (Baileys)

Base bot WhatsApp berbasis [@whiskeysockets/baileys](https://github.com/Whiskeysockets/Baileys) yang dibuat agar mudah dikembangkan dan dipelihara jangka panjang: struktur folder rapi, plugin per-role akses, penyimpanan **SQLite + Drizzle**, dan CLI untuk membuat/mendaftar plugin.

> Tujuan proyek: mempermudah developer membuat bot WhatsApp dan memangkas waktu pengembangan (lihat `.agents/prd.md`).

## Fitur Utama

- 🧩 **Plugin system** — command tersimpan di `src/plugins/<access>/`, didaftarkan otomatis.
- 🔐 **Access role** — `owner`, `admin`, `groups`, `private`, `all` (ditegakkan di handler).
- ⚙️ **Konfigurasi dinamis** — `config.json` dibaca live (edit file, langsung berlaku tanpa restart).
- 🗄️ **SQLite + Drizzle** — data campaign tersimpan rapi + migrasi terjadwal (`drizzle/`).
- 🛠 **CLI tools** — `add:plugin` (scaffold), `list:plugin`, `db:*` (drizzle-kit).
- 🔌 **Utilities** — `createPlugin`, parser argumen, helper JID, media, error (hemat baris).

## Persyaratan

- Node.js **≥ 22** (direkomendasikan v24; `better-sqlite3` v13 dan `node --watch`).
- npm (proyek ini memakai npm; `devEngines` menyetel npm ^11.9.0).

## Instalasi & Menjalankan

```bash
npm install          # pasang dependensi
npm start            # jalankan bot (node index.js)
npm run dev          # mode pengembangan (node --watch index.js)
```

### Pairing / Sesion Pertama

- Sesi WhatsApp tersimpan di `auth_info_baileys/` (gitignored).
- Saat belum terdaftar, bot meminta nomor HP lalu menampilkan **kode pairing** di terminal (bukan QR).
- Keluar dari perangkat (logged out) → hapus `auth_info_baileys/` lalu jalankan ulang untuk pairing baru.

## Konfigurasi — `config.json`

File di root repo (tracked), dibaca **live** oleh `#utils/config.js` — setiap `getConfig()`/`isOwner()` membaca file, jadi edit langsung aktif tanpa restart. Kalau file tidak valid, bot memakai nilai default.

```jsonc
{
  "ownerNumbers": ["628xxxxxxxxx"],        // nomor owner (format internasional, tanpa +)
  "prefixes": ["!", "."],                  // awalan command
  "eval": { "enabled": true, "prefix": ">" }, // backdoor eval owner (matikan di produksi!)
  "messages": {                             // pesan akses ditolak per role
    "owner": "...", "admin": "...",
    "groups": "...", "private": "...",
    "genericError": "Terjadi kesalahan pada sistem."
  },
  "bot": { "name": "whatsend", "footer": "", "defaultJeda": 5000 },
  "reconnect": { "maxAttempts": 3, "delayMs": 5000 },
  "socket": {
    "browser": { "type": "ubuntu", "name": "Chrome" },
    "connectTimeoutMs": 60000,
    "maxMsgRetryCount": 2,
    "keepAliveIntervalMs": 30000
  },
  "pairingPrompt": "Masukan nomor hp : "
}
```

> Keamanan: matikan `eval.enabled` bila bot dipakai di skala produksi.

## Struktur Direktori

```
whatsbot/
├── index.js                  # entrypoint (thin boot)
├── config.json               # konfigurasi dinamis
├── drizzle/                  # migrasi SQL drizzle-kit (commit)
├── src/
│   ├── connection/           # layer realtime (Baileys)
│   │   ├── index.js          #   start(): socket + wiring
│   │   ├── update.js         #   handler status koneksi/reconnect
│   │   ├── message.js        #   orchestrator pesan masuk
│   │   ├── messageBuilder.js #   serialize pesan -> objek `m` (+ m.reply)
│   │   ├── parse.js          #   parse command / JID / body
│   │   └── group.js          #   helper metadata grup
│   ├── plugin/               # mesin plugin
│   │   ├── handler.js        #   registry + akses check
│   │   ├── load.js           #   normalisasi access (+ infer dari folder)
│   │   └── register.js       #   scanner rekursif
│   ├── plugins/              # command (folder = access role)
│   │   ├── owner/            #   admin/ groups/ private/ all/
│   ├── storage/              # SQLite + Drizzle
│   │   ├── schema.js         #   skema tabel
│   │   ├── db.js             #   koneksi better-sqlite3 + runMigrations()
│   │   ├── campaigns.js      #   repository + seed
│   │   └── autoblast.json    #   seed satu kali (jangan tulis manual)
│   └── utils/                # helper: config, plugin, args, jid, media,
│                             #         errors, logger, datetime, general, file
└── scripts/                  # CLI: addPlugin.js, listPlugins.js
```

**Import alias** (`package.json` → `imports`): `#connection/*`, `#plugin/*`, `#plugins/*`, `#utils/*`, `#storage/*`. Selalu pakai alias (dengan `.js`, mis. `#utils/logger.js`) daripada path relatif.

## Scripts npm

```bash
npm run dev              # node --watch index.js (mode dev)
npm start                # node index.js
npm run add:plugin -- <nama> [--access=owner|admin|groups|private|all]
npm run list:plugin      # tampilkan command + access + file
npm run db:generate      # buat migrasi dari schema.js -> drizzle/
npm run db:migrate       # jalankan migrasi (drizzle-kit)
npm run db:push          # push schema langsung ke DB (dev)
```

`add:plugin` membuat `src/plugins/<access>/<nama>.js` (validasi nama/access, guard overwrite; default access `all`).

## Membuat Plugin

1. Jalankan scaffold: `npm run add:plugin -- mycmd --access=owner`
2. Isi logika di `run`:

```js
import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["mycmd"],                 // bisa array utk alias
  access: "owner",                  // opsional; fallback dari folder
  description: "Deskripsi singkat",
  run: async ({ m, sock }) => {
    return m.reply("Halo!");
  },
});
```

- `createPlugin` membungkus `run` dengan try/catch + log + reply error otomatis.
- `access` bisa dilewatkan: kalau file ditaruh di `src/plugins/owner/`, otomatis jadi `owner` (infer dari folder).
- Command di-scroll oleh `src/plugin/register.js` (rekursif, melewati folder `utils`).

### Access role

| access | siapa yang bisa | ketentuan di `handler.js` |
|---|---|---|
| `owner` | hanya owner | `m.isOwner === true` |
| `admin` | admin grup + owner | `m.isAdmin \|\| m.isOwner` |
| `groups` | hanya di dalam grup | `m.isGroup === true` |
| `private` | hanya chat pribadi | `!m.isGroup` |
| `all` | semua | `true` |

Pesan ditolak diambilkan dari `config.json -> messages.<role>`.

## Objek `m`

Dibentuk `messageBuilder.js` untuk setiap pesan masuk: `chat`, `sender`, `fromMe`, `isOwner`, `isGroup`, `isAdmin`, `metadata`, `body`, `command`, `text`, `contentType`, `content`, `mimeType`.

- `m.reply(text | Buffer, { quoted?, caption?, fileName? })` — reply dengan quote default; Buffer mengirim media sesuai `mimeType`.
- `m.replyError(error, text?)` — log error + balas pesan gagal standar.
- `m.quoted` — pesan yang di-reply (`{ content, key, contextInfo }`) atau `null`; dipakai plugin seperti broadcast/repost.

## Penyimpanan (SQLite + Drizzle)

- DB: `src/storage/whatsend.db` (gitignored). Driver `better-sqlite3` (sinkron).
- Schema: `campaigns`, `campaign_cards`, `campaign_targets` (lihat `schema.js`).
- Migrasi: `npm run db:generate` → SQL di `drizzle/` (commit). Bot menerapkan otomatis saat boot (`runMigrations()`), idempotent via tabel `__drizzle_migrations`.
- Repo: `src/storage/campaigns.js` (`getCampaign`, `listCampaigns`, `createCampaign`, `addTarget`, `removeTarget`, `seedFromJsonIfEmpty`, `initStorage`). **Jangan** baca/tulis `autoblast.json` langsung — itu seed sekali jalan.
- ⚠️ `createCampaign` memakai `db.transaction` dengan body **sinkron** (`.run()` per insert). Jangan `await` di dalam callback transaksi.

## Utilities (`src/utils/`)

| file | isi |
|---|---|
| `config.js` | `getConfig`, `reloadConfig`, `isOwner`, `getPrefixes` (live) |
| `plugin.js` | `createPlugin` (factory ± try/catch + error reply) |
| `args.js` | `parseArgs(text, sep)`, `argAt`, `num(value, fallback)` |
| `sendMessage.js` | `sendPoll`, `pollMessageFor`, `formatTable`, `sendTable`, `markdownToWhatsApp`, `sendMessage` (router string/Buffer/object) |
| `parse.js` | `getCommand`, `extractBody`, `extractTextFromContent`, `resolveSenderJid`, `decodeJid`, `isGroup` |
| `jid.js` | `jidToUserNumber`, `phoneToJid`, `isGroupJid` |
| `media.js` | `fetchBuffer`, `sendMediaFromUrl(sock, jid, opts)`, `mediaMessageFor`, `compressImageBuffer` (sharp) |
| `errors.js` | `replyError(m, error, text)` |
| `logger.js` | logger berwarna (`logs.info/warn/error/...`) |
| `datetime.js` | format tanggal/waktu Indonesia, `timeAgo`, `formatDuration` |
| `general.js` / `file.js` / `buttons.js` / `carousel.js` | format Rupiah&nomor, manipulasi file/media, pesan button & carousel (`nativeFlowButtonFor` dipakai bersama untuk memetakan button) |

## Mengirim Pesan (util `sendMessage`)

```js
import {
  sendPoll, sendTable, sendMessage,
  pollMessageFor, formatTable, markdownToWhatsApp,
} from "#utils/sendMessage.js";

// Polling (selectableCount: 1 = tunggal, 0 = multi, 2+ = multi maks. N)
await sendPoll(sock, jid, { question: "Pilih?", options: ["A", "B", "C"], selectableCount: 1 });

// Tabel dalam blok kode
await sendTable(sock, jid, { headers: ["Item", "Qty"], rows: [["Pulsa", 5]], title: "*Stok*" });

// Markdown -> format WhatsApp
await sendMessage(sock, jid, "Halo **teman**!", { markdown: true });

// Router: string / Buffer / object
await sendMessage(sock, jid, { poll: pollMessageFor({ question: "Q", options: ["a", "b"] }).poll });
await sendMessage(sock, jid, imageBuffer);
```

Semua builder (`pollMessageFor`, `formatTable`, `markdownToWhatsApp`) murni — hasilnya bisa juga dikirim lewat `m.reply(...)` di plugin.

## Panduan Kontribusi

- **Jangan commit langsung ke `main`** — buat branch `change-type/nama-feature` (mis. `feature/add-login`, `bugfix/...`).
- Sebelum commit, jalankan `node --check <file>` untuk memastikan tidak ada syntax error.
- Tidak ada linter/test suite; `node --check` adalah pintu verifikasi minimum.
- Dokumentasi teknis untuk agent: lihat `AGENTS.md`. Detail PRD: `.agents/prd.md`.

## Lisensi

ISC