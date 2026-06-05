import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { Database } from "./db-helper.js";
import gateway from "./gateway.js";

const transaksiService = new Database("transaksi");
const userService = new Database("user");

const POOLING_INTERVAL_MS = 10000;
const EXPIRED_TIMEOUT_MINUTES = 15;

class PoolingWorker {
  constructor(sock) {
    this.sock = sock;
    this.isProcessing = false;
  }

  async getPendingTransactions() {
    try {
      const transaksiTable = db._.fullSchema.transaksi;
      return await db
        .select()
        .from(transaksiTable)
        .where(eq(transaksiTable.status, "pending"))
        .all();
    } catch (error) {
      if (process.env.DEBUG) {
        console.error("💥 [DEBUG-POOLING-FETCH-ERR]:", error.message);
      }
      return [];
    }
  }

  async processQueue() {
    this.isProcessing = true;

    try {
      const pendingTrx = await this.getPendingTransactions();

      if (pendingTrx.length === 0) return;

      if (process.env.DEBUG) {
        console.log(
          `⏳ [DEBUG-POOLING]: Memproses ${pendingTrx.length} transaksi pending...`,
        );
      }

      const now = new Date();

      for (const trx of pendingTrx) {
        try {
          if (trx.created_at) {
            const trxTime = new Date(trx.created_at.replace(" ", "T"));
            const diffMinutes = Math.floor((now - trxTime) / 1000 / 60);

            if (diffMinutes >= EXPIRED_TIMEOUT_MINUTES) {
              if (process.env.DEBUG) {
                console.log(
                  `⏰ [DEBUG-POOLING-EXPIRED]: Transaksi ID ${trx.id} kedaluwarsa setelah ${diffMinutes} menit.`,
                );
              }
              await this.handleFailedTransaction(
                trx,
                `Pesanan menggantung terlalu lama di pusat (> ${EXPIRED_TIMEOUT_MINUTES} menit)`,
              );
              continue;
            }
          }

          const { data } = await gateway.status_trx(trx.reff_id);

          if (data && data.status_code == 200) {
            await this.handleSuccessTransaction(trx, data);
          } else {
            await this.handleFailedTransaction(
              trx,
              data?.message || "Gagal dari pusat",
            );
          }
        } catch (trxError) {
          if (process.env.DEBUG) {
            console.error(
              `❌ [DEBUG-POOLING-ROW-ERR] ID ${trx.id}:`,
              trxError.message,
            );
          }
        }
      }
    } catch (queueError) {
      if (process.env.DEBUG) {
        console.error("💥 [DEBUG-POOLING-CRITICAL]:", queueError.message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async _sendWhatsAppNotification(userId, message) {
    if (!this.sock) return;

    try {
      const userData = await userService.findById(userId);
      if (!userData || !userData.phone) return;

      let phoneFormatted = userData.phone.replace(/^[+0]/, "62");
      if (!phoneFormatted.startsWith("62")) {
        phoneFormatted = `62${phoneFormatted}`;
      }

      const chatJid = `${phoneFormatted}@s.whatsapp.net`;
      await this.sock.sendMessage(chatJid, { text: message });
    } catch (error) {
      if (process.env.DEBUG) {
        console.error(
          `⚠️ [DEBUG-WA-SEND-ERR] User ID ${userId}:`,
          error.message,
        );
      }
    }
  }

  async handleSuccessTransaction(trx, trxData) {
    try {
      db.transaction((tx) => {
        const userTable = db._.fullSchema.user;
        const transaksiTable = db._.fullSchema.transaksi;

        tx.update(transaksiTable)
          .set({ status: "success" })
          .where(eq(transaksiTable.id, trx.id))
          .run();

        tx.update(userTable)
          .set({
            saldo_hold: sql`${userTable.saldo_hold} - ${trx.harga}`,
          })
          .where(eq(userTable.id, trx.user_id))
          .run();
      });

      if (process.env.DEBUG) {
        console.log(
          `✨ [DEBUG-POOLING-SUCCESS]: Transaksi ID ${trx.id} sukses.`,
        );
      }

      const msgSuccess =
        `🎉 *TRANSAKSI BERHASIL!*\n\n` +
        `🆔 *ID Trx :* ${trx.id}\n` +
        `📦 *Produk :* ${trx.produk}\n` +
        `🎯 *Tujuan :* \`${trx.tujuan}\`\n` +
        `🧾 *SN     :* \`${trxData.sn || "-"}\`\n\n` +
        `💰 Saldo hold Anda telah dicairkan untuk pembayaran produk ini. Terima kasih! 🙏✨`;

      await this._sendWhatsAppNotification(trx.user_id, msgSuccess);
    } catch (e) {
      if (process.env.DEBUG) {
        console.error("💥 [DEBUG-POOLING-DB-SUCCESS-ERR]:", e.message);
      }
    }
  }

  async handleFailedTransaction(trx, rincianGagal) {
    try {
      db.transaction((tx) => {
        const userTable = db._.fullSchema.user;
        const transaksiTable = db._.fullSchema.transaksi;

        tx.update(transaksiTable)
          .set({ status: "failed" })
          .where(eq(transaksiTable.id, trx.id))
          .run();

        tx.update(userTable)
          .set({
            saldo: sql`${userTable.saldo} + ${trx.harga}`,
            saldo_hold: sql`${userTable.saldo_hold} - ${trx.harga}`,
          })
          .where(eq(userTable.id, trx.user_id))
          .run();
      });

      if (process.env.DEBUG) {
        console.log(
          `↩️ [DEBUG-POOLING-REFUND]: Refund sukses untuk User ID ${trx.user_id}.`,
        );
      }

      const msgFailed =
        `❌ *TRANSAKSI GAGAL / COBA LAGI*\n\n` +
        `🆔 *ID Trx :* ${trx.id}\n` +
        `📦 *Produk :* ${trx.produk}\n` +
        `🎯 *Tujuan :* \`${trx.tujuan}\`\n` +
        `🚨 *Alasan :* ${rincianGagal}\n\n` +
        `💰 *Saldo anda Rp ${trx.harga.toLocaleString("id-ID")} telah dikembalikan .*\n\n` +
        `📝 *Note:* Silahkan ulang 1x lagi\n\n` +
        `📝jika masih gagal, silahkan *Cek UNREG* baru coba kembali 🔄\n\n` +
        `🙏 Mohon kerjasama nya yaak🩵`;

      await this._sendWhatsAppNotification(trx.user_id, msgFailed);
    } catch (transactionError) {
      if (process.env.DEBUG) {
        console.error(
          `💥 [DEBUG-CRITICAL-ROLLBACK]: Pooling ID ${trx.id}:`,
          transactionError.message,
        );
      }
    }
  }

  start() {
    if (process.env.DEBUG) {
      console.log(
        "🚀 [DEBUG-POOLING-START]: Engine Saldo Hold Anti-Fraud aktif.",
      );
    }
    setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue();
      }
    }, POOLING_INTERVAL_MS);
  }
}

export default PoolingWorker;
