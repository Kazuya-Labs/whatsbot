import { delay, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import Handler from "../utils/registerHandler.js";
import PoolingWorker from "../utils/polling-worker.js";

// Variabel pelacak statis untuk melacak jumlah percobaan reconnect (mencegah badai crash loop)
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Menangani siklus pembaruan koneksi WhatsApp (Baileys v7.x)
 * @param {import('@whiskeysockets/baileys').ConnectionState} update
 * @param {Function} fnStart - Fungsi factory untuk menyalakan ulang soket
 * @param {any} sock - Instance soket saat ini (untuk pembersihan memori)
 */
const handleConnection = async (update, fnStart, sock = null) => {
  try {
    const { connection, lastDisconnect, qr } = update;

    // 🛠️ OPTIMASI 1: Tampilkan log QR secara ringkas jika fitur pairing code tidak digunakan / fallback
    if (qr) {
      console.log(
        "ℹ️ [SISTEM]: QR Code baru terdeteksi. Silakan scan jika diperlukan.",
      );
    }

    // --- KONDISI 1: KONEKSI DITUTUP (CLOSE) ---
    if (connection === "close") {
      // Ambil kode status error menggunakan Boom secara aman
      const errorReason = lastDisconnect?.error;
      const statusCode =
        errorReason instanceof Boom
          ? errorReason.output.statusCode
          : new Boom(errorReason)?.output?.statusCode;

      console.log(`⚠️ [KONEKSI]: Terputus. Alasan status code: ${statusCode}`);

      // 🛠️ OPTIMASI 2: Bersihkan event listeners dari soket lama agar tidak terjadi memory leak (kebocoran RAM)
      if (sock?.ev) {
        sock.ev.removeAllListeners("connection.update");
        sock.ev.removeAllListeners("messages.upsert");
        sock.ev.removeAllListeners("creds.update");
      }

      // 🛠️ OPTIMASI 3: Percabangan evaluasi alasan pemutusan (Baileys v7 Best Practices)
      switch (statusCode) {
        case DisconnectReason.loggedOut:
          console.error(
            "❌ [OTENTIKASI]: Perangkat telah keluar (Logged Out). Hapus folder session dan scan ulang!",
          );
          reconnectAttempts = 0; // Reset counter
          // Jangan panggil fnStart() di sini untuk mencegah loop koneksi mati
          break;

        case DisconnectReason.banned:
          console.error(
            "❌ [BLOKIR]: Nomor WhatsApp Anda telah dibanned oleh pihak Meta/WhatsApp!",
          );
          reconnectAttempts = 0;
          break;

        case DisconnectReason.badSession:
          console.error(
            "❌ [SESI RUSAK]: File sesi tidak valid atau rusak. Silakan hapus folder session!",
          );
          reconnectAttempts = 0;
          break;

        case DisconnectReason.connectionRequired:
          console.log(
            "ℹ️ [SISTEM]: Diperlukan koneksi awal. Mencoba menghubungkan kembali...",
          );
          await delay(2000);
          fnStart();
          break;

        default:
          // 🛠️ OPTIMASI 4: Terapkan Exponential Backoff untuk alasan umum (RTO, Stream Errored, Connection Lost, Restart Required)
          reconnectAttempts++;
          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error(
              `🛑 [CRASH]: Reconnect gagal setelah ${MAX_RECONNECT_ATTEMPTS} kali percobaan. Berhenti untuk keamanan server.`,
            );
            process.exit(1); // Matikan proses agar PM2 / Docker bisa melakukan fresh restart bersih
          }

          // Jeda waktu reconnect bertambah lama seiring jumlah kegagalan (e.g., 5s, 10s, 15s...) untuk menghemat CPU/RAM
          const backoffDelay = Math.min(reconnectAttempts * 5000, 30000);
          console.log(
            `🔄 [SISTEM]: Mencoba menyambung ulang dalam ${backoffDelay / 1000} detik... (Percobaan ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          );

          await delay(backoffDelay);
          fnStart();
          break;
      }
    }

    // --- KONDISI 2: KONEKSI BERHASIL TERBUKA (OPEN) ---
    else if (connection === "open") {
      console.log(
        "✅ [KONEKSI]: Berhasil terhubung ke server WhatsApp! Bot siap digunakan.",
      );

      // Reset pelacak kegagalan setelah sukses terhubung
      reconnectAttempts = 0;

      // 🛠️ OPTIMASI 5: Cek apakah handler sudah teregistrasi sebelumnya untuk menghemat pembacaan I/O Disk
      if (!Handler.list || Object.keys(Handler.list).length === 0) {
        console.log("📂 [SISTEM]: Memulai registrasi pustaka plugin...");
        await Handler.register();
        console.log(
          `✨ [SISTEM]: Sukses memuat ${Object.keys(Handler.list).length} perintah.`,
        );
      } else {
        console.log(
          "ℹ️ [SISTEM]: Plugin sudah dimuat sebelumnya. Melewati registrasi ulang.",
        );
      }
      const worker = new PoolingWorker(sock);
      worker.start();
    }
  } catch (e) {
    console.error(
      "💥 [ERROR_CONNECTION]: Gagal memproses pembaruan status koneksi:",
      e.message || e,
    );
  }
};

export default handleConnection;
