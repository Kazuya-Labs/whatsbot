// @ts-check
import makeWASocket, { DisconnectReason } from "baileys";
import delay from "delay";
import { starting } from "../../index.js";

let reconnectCount = 0;

/**
 * Mengelola perubahan status koneksi WhatsApp
 * @param {import("baileys").BaileysEventMap['connection.update']} update
 * @param {ReturnType<typeof makeWASocket>} sock
 */
const connectionUpdate = async (update, sock) => {
  const { connection, lastDisconnect } = update;

  if (connection === "close") {
    // Mengambil kode alasan kenapa koneksi terputus
    // @ts-ignore
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    reconnectCount++;
    console.log(
      `Koneksi terputus (Alasan: ${statusCode}), menyambung ulang ke-${reconnectCount}...`,
    );

    // Hapus seluruh event listener dari socket lama agar tidak menumpuk di memori VPS
    sock.ev.removeAllListeners("connection.update");
    sock.ev.removeAllListeners("creds.update");
    sock.ev.removeAllListeners("messages.upsert");

    // Jika diputus karena logout dari HP, jangan reconnect otomatis (mencegah loop abadi)
    if (statusCode === DisconnectReason.loggedOut) {
      console.log(
        "Perangkat telah keluar (Logged Out). Silakan hapus folder sesi dan jalankan ulang untuk pairing baru.",
      );
      return;
    }

    // Panggil kembali fungsi inisialisasi utama untuk membuat koneksi baru
    if (reconnectCount > 3) return;
    await delay(5000);
    starting().catch((err) => console.error("Gagal reconnect:", err));
  }

  if (connection === "open") {
    console.log("Bot WhatsApp Berhasil Terhubung!");
    reconnectCount = 0; // Reset hitungan jika sukses tersambung
  }
};

export { connectionUpdate };
