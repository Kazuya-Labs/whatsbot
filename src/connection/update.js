// @ts-check
import { DisconnectReason } from "baileys";
import delay from "delay";
import { getConfig } from "#utils/config.js";

let reconnectCount = 0;

/**
 * Mengelola perubahan status koneksi WhatsApp
 * @param {import("baileys").BaileysEventMap['connection.update']} update
 * @param {ReturnType<typeof import("baileys").makeWASocket>} sock
 * @param {() => Promise<void>} onReconnect - fungsi start() yang di-inject untuk menghindari circular import
 */
const connectionUpdate = async (update, sock, onReconnect) => {
  const { connection, lastDisconnect } = update;
  const { maxAttempts, delayMs } = getConfig().reconnect;

  if (connection === "close") {
    // kode alasan koneksi terputus
    // @ts-ignore
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    reconnectCount++;
    console.log(
      `Koneksi terputus (Alasan: ${statusCode}), menyambung ulang ke-${reconnectCount}...`,
    );

    // Hapus SEMUA listener socket lama + tutup socket agar tidak menumpuk
    // di memori (closure handler menahan socket tua, bocor tiap reconnect).
    sock.ev.removeAllListeners("connection.update");
    sock.ev.removeAllListeners("creds.update");
    sock.ev.removeAllListeners("messages.upsert");
    sock.ev.removeAllListeners("groups.update");
    sock.ev.removeAllListeners("group-participants.update");

    // Tutup socket eksplisit agar WebSocket/timer keepalive dirilis & bisa di-GC.
    sock.end?.();

    // Jangan auto-reconnect bila logout dari HP (mencegah loop abadi)
    if (statusCode === DisconnectReason.loggedOut) {
      console.log(
        "Perangkat telah keluar (Logged Out). Silakan hapus folder sesi dan jalankan ulang untuk pairing baru.",
      );
      return;
    }

    // panggil ulang inisialisasi untuk koneksi baru
    if (reconnectCount > maxAttempts) return;
    await delay(delayMs);
    onReconnect?.().catch((err) => console.error("Gagal reconnect:", err));
  }

  if (connection === "open") {
    console.log("Bot WhatsApp Berhasil Terhubung!");
    reconnectCount = 0; // reset hitungan saat sukses tersambung
  }
};

export { connectionUpdate };