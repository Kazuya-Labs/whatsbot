### 🚀 Release Notes & Changelog
📝 Ringkasan Perubahan

> Entri terbaru berada di bagian paling atas. **Dilarang mencantumkan kredensial sensitif** pada changelog ini (kode pairing, isi sesi `auth_info_baileys/`, token/API key, `.env`, dump DB, atau nilai `config.json`).

## [2026-08-30] — Refactor DRY: Satu Sumber Kebenaran untuk Logika Serupa
### 🔧 Perubahan Internal
- Mapper button native-flow diekstrak jadi `nativeFlowButtonFor` (dipakai `buttons.js` dan `carousel.js`; menambahkan dukungan `merchant_url` & `call`).
- `fetchBuffer` baru di media util; `sendMediaFromUrl` memakainya, begitu juga `fetchAndCompressImage` carousel (lewat `compressImageBuffer`).
- `m.reply` untuk input Buffer kini pakai `mediaMessageFor` (tidak ada lagi logic media yang ditulis 2×).
- Ekstraksi teks disatukan di `extractTextFromContent` (dipakai `extractBody` dan plugin `swgc`).
- Pengecekan JID grup disatukan di `isGroupJid` (`jid.js`; dipakai `parse.isGroup` dan `parseGroupIds` plugin `swgc`).
- Perilaku kirim pesan tidak berubah.
### 📁 File Terkait
- src/utils/buttons.js, src/utils/carousel.js, src/utils/media.js, src/utils/jid.js
- src/connection/parse.js, src/connection/messageBuilder.js, src/plugins/owner/swgc.js

## [2026-08-29] — Plugin swgc: Broadcast Reply ke Beberapa Grup
### ✨ Fitur Baru
- Command `swgc` (access owner): reply sebuah pesan lalu ketik `.swgc idgrup1,idgrup2,...` untuk **broadcast** pesan/media itu ke setiap grup yang didaftarkan.
- Mendukung teks, gambar (di-kompres/resize otomatis via **sharp**), video, audio, dokumen, dan stiker — caption/mime dipertahankan.
- Parser daftar grup (koma/whitespace), token bukan `@g.us` diabaikan, JID duplikat dilewati; kegagalan satu grup tidak menghentikan pengiriman ke grup lain.
### 🔧 Perubahan Internal
- Objek `m` kini punya `m.quoted` (isi + key pesan yang di-reply) untuk dipakai plugin lain.
- Util media baru `compressImageBuffer` (sharp: resize + JPEG).
### 📁 File Terkait
- src/plugins/owner/swgc.js (File Baru)
- src/connection/messageBuilder.js (`m.quoted`)
- src/utils/media.js (`compressImageBuffer`)

## [2026-08-29] — Util Kirim Pesan: Polling, Tabel, Markdown
### ✨ Fitur Baru
- Util baru `sendMessage` untuk mengirim pesan dengan lebih mudah:
  - **Polling** — `sendPoll` / builder `pollMessageFor` (2–12 pilihan, `selectableCount` dinamis: 1 = pilih tunggal, 0 = multi, 2+ = multi maksimal N).
  - **Tabel** — `formatTable` (tabel ASCII dalam blok kode, padding otomatis) + `sendTable` (bisa dengan judul).
  - **Markdown** — `markdownToWhatsApp` (konversi subset md → format WhatsApp: tebal/miring/strike, heading, link, bullet, blok kode aman) + flag `markdown` di router.
  - **Router terpadu** — `sendMessage(sock, jid, content)` menerima string, Buffer (media), atau object (passthrough). Kompatibel dengan `m.reply`.
### 📁 File Terkait
- src/utils/sendMessage.js (File Baru)

## [2026-08-29] — Plugin Menu untuk Semua User + Filter Akses
### ✨ Fitur Baru
- Command `menu` / `help` dengan akses `all` — bisa dipakai siapa saja.
- `menu` menampilkan semua perintah terdaftar, dikelompokkan per role (Owner, Admin, Grup, Private, Semua) lengkap dengan deskripsi.
- Argumen opsional filter: `menu owner|admin|groups|private|all` — hanya menampilkan perintah dari akses tsb; filter tidak dikenal diberi jawaban petunjuk.
- Registry plugin kini menyimpan `description` tiap command (dipakai menu).
### 📁 File Terkait
- src/plugins/all/menu.js (File Baru)
- src/plugin/load.js (simpan `description` di options)

## [2026-08-29] — Dokumentasi Pengembang + Penataan Internal
### 🔧 Perubahan Internal
- README.md: panduan lengkap untuk developer (setup, konfigurasi, plugin system, storage, util, panduan kontribusi).
- `.agents/` & `AGENTS.md` di-gitignore dan tidak lagi di-commit (dokumen internal), file lokal tetap ada.
- Koreksi syarat versi Node menjadi ≥22 (konsisten dengan better-sqlite3 v13).
### 📁 File Terkait
- README.md (File Baru)
- .gitignore

## [2026-08-29] — Konfigurasi Dinamis via config.json
### ✨ Fitur Baru
- Nilai hardcode dipindah ke `config.json` dan dibaca **live** tanpa restart (`getConfig`/`isOwner`/`getPrefixes`): daftar owner, prefix command, pesan akses ditolak per role, backdoor eval (dapat dimatikan), jeda default campaign, parameter reconnect, pengaturan socket Baileys, dan prompt pairing.
- File config tidak valid → otomatis memakai nilai default (tetap jalan).
### 📁 File Terkait
- src/utils/config.js (File Baru)
- config.json
- src/connection/{index,message,messageBuilder,parse,update}.js, src/plugin/handler.js, src/storage/campaigns.js, src/plugins/owner/autoBlast.js

## [2026-08-29] — Dev Utilities & Refactor Plugin
### ✨ Fitur Baru
- Factory `createPlugin` menyeragamkan bentuk plugin (try/catch + log + reply error otomatis).
- Helpers baru: parse argumen, konversi JID/telepon, kirim media dari URL, reply error standar.
- Semua plugin refactor memakai `createPlugin`; scaffolder `add:plugin` menghasilkan template berbasis factory.
### 📁 File Terkait
- src/utils/{plugin,args,jid,errors,media}.js
- scripts/addPlugin.js
- src/plugins/owner/*.js (refactor)

## [2026-08-29] — Refactor Akses Plugin per Folder
### 🔧 Perubahan Internal
- Struktur plugin dikelompokkan per role akses: `src/plugins/{owner,admin,groups,private,all}`.
- Access otomatis ter-infer dari folder bila plugin tidak menyebutkannya; matriks akses tetap di-enforce di handler.
### 📁 File Terkait
- src/plugin/load.js (infer akses dari folder)
- src/plugins/{owner,admin,groups,private,all}/

## [2026-08-29] — Implementasi Dasar (PRD)
### ✨ Fitur Baru
- Storage SQLite + Drizzle: tabel campaigns/campaign_cards/campaign_targets, migrasi (drizzle-kit) + auto-migrate saat boot.
- CLI: `add:plugin` (scaffold plugin + akses), `list:plugin` (daftar command), skrip `db:*`.
- Sistem role akses pada handler (owner/admin/groups/private/all) dengan pesan tolak per role.
- Layer koneksi Baileys dengan serialize pesan ke objek `m` + `m.reply`.
### 📁 File Terkait
- src/storage/{schema,db,campaigns}.js, drizzle/
- scripts/{addPlugin,listPlugins}.js
- src/plugin/{handler,load,register}.js
- src/connection/*