import { Boom } from "@hapi/boom";
import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  delay,
} from "@whiskeysockets/baileys";
import readline from "readline/promises";
import P from "pino";
import NodeCache from "node-cache";

// Import modules internal lokal wajib menggunakan ekstensi .js (ESM)
import messageUpsert from "./connection/MessageUpsert.js";
import handleConnection from "./connection/handleConnect.js";

// 🛠️ OPTIMASI 1: Bersihkan redundansi logger & matikan alokasi objek pino yang tidak perlu
const logger = P({ level: "silent" });

// 🛠️ OPTIMASI 2: Buat instance NodeCache global tunggal (Singleton) untuk mengurangi overhead re-alokasi memori
// stdTTL 120s sudah sangat cukup dan hemat memori untuk mencegah double-process/retry di Baileys 7.x
const msgRetryCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 30,
  useClones: false,
});

/**
 * Meminta pairing code dari pengguna dengan penanganan interupsi yang aman
 */
async function generateCode(sock) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const input = await rl.question(
      "🔹 Masukan Nomor WhatsApp (Contoh: 628xxx): ",
    );
    const number = input.replace(/[^0-9]/g, "");

    if (!number) {
      console.log("❌ Nomor tidak valid!");
      rl.close();
      return generateCode(sock);
    }

    console.log("⏳ Meminta pairing code ke server WhatsApp...");
    const code = await sock.requestPairingCode(number);
    console.log(`\n✅ [PAIRING CODE ANDA]: ${code}\n`);

    // Beri waktu napas untuk internal state Baileys sebelum terminal ditutup
    await delay(3000);
  } catch (err) {
    console.error("❌ Gagal generate pairing code:", err.message);
    console.log("Mencoba ulang proses...");
    return generateCode(sock);
  } finally {
    rl.close(); // Wajib ditutup agar tidak terjadi memory leak pada stream process.stdin
  }
}

/**
 * Fungsi Utama Inisialisasi Bot WhatsApp
 */
async function start() {
  try {
    // 🛠️ OPTIMASI 3: Menggunakan Destructuring & Async/Await modern untuk versi terbaru Baileys
    const { state, saveCreds } =
      await useMultiFileAuthState("baileys_auth_info");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    if (process.env.DEBUG) {
      console.log(
        `ℹ️ Menggunakan Baileys v${version.join(".")} (Terbaru: ${isLatest})`,
      );
    }

    // 🛠️ OPTIMASI 4: Fungsi getMessage yang benar.
    // Kode juniormu sebelumnya hanya melakukan `.get()` tanpa me-return nilainya (Sia-sia & Buggy).
    const getMessage = async (key) => {
      const msg = msgRetryCache.get(key.id);
      return msg?.message || undefined;
    };

    // 🛠️ OPTIMASI 5: Inisialisasi WASocket dengan parameter efisiensi memori tingkat tinggi untuk v7.x
    const sock = makeWASocket({
      version,
      logger,
      getMessage,
      printQRInTerminal: false,
      syncFullHistory: false, // ⚡ Sangat Krusial! Mematikan sinkronisasi riwayat chat jadul untuk menghemat RAM hingga 80%
      downloadHistory: false, // ⚡ Jangan download chat lama, hemat bandwidth dan memori server
      msgRetryCounterCache: msgRetryCache, // Menggunakan NodeCache (bukan Map biasa) mencegah RAM bocor saat badai retry melanda
      generateHighQualityLinkPreview: false, // Matikan rincian HD preview link jika tidak dibutuhkan, menghemat beban CPU
      markOnlineOnConnect: false,
      auth: {
        creds: state.creds,
        // ⚡ Cacheable Key Store krusial agar I/O disk ke folder session tidak terlalu intensif
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu("Chrome"),
    });

    // 🛠️ OPTIMASI 6: Kondisi pengecekan registrasi pairing code
    if (!sock.authState.creds.registered) {
      console.log("ℹ️ Perangkat belum terintegrasi.");
      // Menjalankan pairing secara asinkron tanpa menahan event loop utama
      process.nextTick(async () => {
        try {
          await generateCode(sock);
        } catch (e) {
          console.error("Proses pairing terhenti:", e.message);
        }
      });
    }

    // --- EVENT LISTENERS ---

    // Mengontrol siklus koneksi (koneksi putus, reconnect, dll.)
    sock.ev.on("connection.update", async (update) => {
      // Pastikan fungsi handleConnection menerima argumen factory 'start' jika butuh restart instant
      await handleConnection(update, start, sock);
    });

    // Menangani pembaruan kredensial sesi
    sock.ev.on("creds.update", saveCreds);

    // Menangani pesan masuk
    sock.ev.on("messages.upsert", (event) => {
      // Direct pass event tanpa membungkus fungsi anonim tambahan guna menghemat call-stack memori
      messageUpsert(event, sock);
    });

    return sock;
  } catch (err) {
    console.error("💥 Gagal menginisialisasi core socket:", err);
    // Skema exponential backoff retry bisa diletakkan di sini jika inisialisasi awal gagal total
    await delay(5000);
    return start();
  }
}

// Eksekusi core sistem
start();
