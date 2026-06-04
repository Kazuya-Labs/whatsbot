import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { Database } from "./db-helper.js";

const transaksiService = new Database("transaksi");
const userService = new Database("user");

const POOLING_INTERVAL_MS = 10000;
class PoolingWorker {
  constructor(sock) {
    this.sock = sock;
    this.isProcessing = false;
  }

  // ... (Fungsi getPendingTransactions & processQueue tetap sama seperti versi sebelumnya) ...

  /**
   * HANDLING SUKSES: Kurangi Saldo Hold (Selesai/Dilepas Permanen)
   */
  async handleSuccessTransaction(trx, trxData) {
    try {
      await db.transaction(async (tx) => {
        const userTable = db._.fullSchema.user;
        const transaksiTable = db._.fullSchema.transaksi;

        // 1. Ubah status transaksi lokal ke 'success'
        await tx
          .update(transaksiTable)
          .set({ status: "success" })
          .where(eq(transaksiTable.id, trx.id));

        // 2. Bersihkan/kurangi uang dari komponen saldo_hold karena transaksi tuntas
        await tx
          .update(userTable)
          .set({
            saldo_hold: sql`${userTable.saldo_hold} - ${trx.harga}`,
          })
          .where(eq(userTable.id, trx.user_id));
      });

      console.log(
        `✨ [POOLING_SUCCESS]: Hold terlepas. Transaksi ID ${trx.id} sukses.`,
      );

      // Kirim Notifikasi ke WhatsApp
      const userData = await userService.findById(trx.user_id);
      if (userData && this.sock) {
        const chatJid = `${userData.phone}@s.whatsapp.net`;
        const msgSuccess =
          `✅ *TRANSAKSI SUKSES!*\n\n` +
          `▪ *ID Trx:* ${trx.id}\n` +
          `▪ *Produk:* ${trx.produk}\n` +
          `▪ *Tujuan:* ${trx.tujuan}\n` +
          `▪ *SN:* \`${trxData.sn || "-"}\`\n\n` +
          `Saldo hold Anda telah dicairkan untuk pembayaran produk ini. Terima kasih!`;
        await this.sock.sendMessage(chatJid, { text: msgSuccess });
      }
    } catch (e) {
      console.error("💥 [POOLING_SUCCESS_DB_ERROR]:", e.message);
    }
  }

  /**
   * HANDLING GAGAL: Kembalikan Saldo Hold ke Saldo Utama (Safe Refund)
   */
  async handleFailedTransaction(trx, rincianGagal) {
    try {
      // 🛡️ ANTI-FRAUD TRANSACTION SINKRONISASI
      await db.transaction(async (tx) => {
        const userTable = db._.fullSchema.user;
        const transaksiTable = db._.fullSchema.transaksi;

        // 1. Set status transaksi menjadi failed
        await tx
          .update(transaksiTable)
          .set({ status: "failed" })
          .where(eq(transaksiTable.id, trx.id));

        // 2. Ambil kembali dari saldo_hold dan pindahkan ke saldo utama (Refund Aman)
        await tx
          .update(userTable)
          .set({
            saldo: sql`${userTable.saldo} + ${trx.harga}`,
            saldo_hold: sql`${userTable.saldo_hold} - ${trx.harga}`,
          })
          .where(eq(userTable.id, trx.user_id));
      });

      console.log(
        `↩️ [POOLING_REFUND]: Sukses memindahkan kembali hold ke saldo utama untuk User ID ${trx.user_id}.`,
      );

      // Kirim Notifikasi ke WhatsApp
      const userData = await userService.findById(trx.user_id);
      if (userData && this.sock) {
        const chatJid = `${userData.phone}@s.whatsapp.net`;
        const msgFailed =
          `❌ *TRANSAKSI GAGAL / COBA LAGI*\n\n` +
          `▪ *ID Trx:* ${trx.id}\n` +
          `▪ *Produk:* ${trx.produk}\n` +
          `▪ *Tujuan:* ${trx.tujuan}\n` +
          `▪ *Alasan:* ${rincianGagal}\n\n` +
          `💰 *Dana hold sebesar Rp ${trx.harga.toLocaleString("id-ID")} telah dikembalikan seutuhnya ke saldo utama Anda.*`;
        await this.sock.sendMessage(chatJid, { text: msgFailed });
      }
    } catch (transactionError) {
      console.error(
        `💥 [CRITICAL_ROLLBACK_HOLD] Gagal memproses refund di pooling ID ${trx.id}:`,
        transactionError.message,
      );
    }
  }

  start() {
    console.log("🚀 [POOLING_WORKER]: Engine Saldo Hold Anti-Fraud aktif.");
    setInterval(() => this.processQueue(), POOLING_INTERVAL_MS);
  }
}

export default PoolingWorker;
