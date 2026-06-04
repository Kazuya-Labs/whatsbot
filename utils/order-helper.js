import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import ppob from "./gateway.js";

const userLocks = new Set();

export const createOrderSecure = async (
  sock,
  m,
  targetUserId,
  kodeProduk,
  nomorTujuan,
  hargaProduk,
) => {
  if (userLocks.has(targetUserId)) {
    return m.reply(
      "⏳ Transaksi Anda sebelumnya sedang diproses. Mohon tunggu!",
    );
  }
  userLocks.add(targetUserId);

  const reffId = `TRX${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    let successCreatedTrx = null;

    // 🛡️ ANTI-FRAUD: Pindahkan Saldo Utama ke Saldo Hold (Mekanisme Locking Finansial)
    await db.transaction(async (tx) => {
      const userTable = db._.fullSchema.user;

      const user = await tx
        .select()
        .from(userTable)
        .where(eq(userTable.id, targetUserId))
        .get();
      if (!user) throw new Error("USER_NOT_FOUND");
      if (user.saldo < hargaProduk) throw new Error("INSUFFICIENT_BALANCE");

      // Potong saldo utama, tambahkan ke saldo_hold secara bersamaan (Atomic)
      const [updatedUser] = await tx
        .update(userTable)
        .set({
          saldo: sql`${userTable.saldo} - ${hargaProduk}`,
          saldo_hold: sql`${userTable.saldo_hold} + ${hargaProduk}`, // 💡 Saldo diamankan di sini
        })
        .where(
          and(
            eq(userTable.id, targetUserId),
            gte(userTable.saldo, hargaProduk),
          ),
        )
        .returning();

      if (!updatedUser) throw new Error("RACE_CONDITION_DETECTED");

      // Catat transaksi pending
      const transaksiTable = db._.fullSchema.transaksi;
      [successCreatedTrx] = await tx
        .insert(transaksiTable)
        .values({
          reff_id: reffId,
          user_id: targetUserId,
          produk: kodeProduk,
          tujuan: nomorTujuan,
          harga: hargaProduk,
          status: "pending",
        })
        .returning();
    });

    if (!successCreatedTrx) throw new Error("FAILED_TO_SAVE_TRX");

    await m.reply(
      `⏳ *TRANSAKSI DIPROSES*\n\nSaldo Anda sebesar Rp ${hargaProduk.toLocaleString("id-ID")} telah dibekukan sementara untuk transaksi ini.\nRefID: \`${reffId}\``,
    );

    // Kirim ke server pusat PPOB
    const apiResponse = await ppob.create_trx(reffId, kodeProduk, nomorTujuan);

    if (!apiResponse || apiResponse.status === false) {
      throw new Error(
        `GATEWAY_REJECTED: ${apiResponse?.message || "Gangguan produk"}`,
      );
    }
  } catch (error) {
    console.error("💥 [ORDER_FAILED]:", error.message);

    if (error.message.startsWith("GATEWAY_REJECTED")) {
      const rincian = error.message.replace("GATEWAY_REJECTED: ", "");
      // Jika ditolak di awal oleh server pusat, lepaskan hold saldo secara instan
      await releaseHoldSaldo(
        targetUserId,
        hargaProduk,
        reffId,
        "failed",
        rincian,
        m,
      );
    } else if (error.message === "INSUFFICIENT_BALANCE") {
      m.reply("❌ Transaksi gagal! Saldo Anda tidak mencukupi.");
    } else {
      m.reply("❌ Terjadi kesalahan internal sistem.");
    }
  } finally {
    userLocks.delete(targetUserId);
  }
};

/**
 * Helper internal untuk melepas hold saldo jika server pusat langsung menolak di awal
 */
const releaseHoldSaldo = async (
  userId,
  harga,
  reffId,
  statusFinal,
  alasan,
  m,
) => {
  try {
    await db.transaction(async (tx) => {
      const userTable = db._.fullSchema.user;
      const transaksiTable = db._.fullSchema.transaksi;

      // Kembalikan dari hold ke saldo utama
      await tx
        .update(userTable)
        .set({
          saldo: sql`${userTable.saldo} + ${harga}`,
          saldo_hold: sql`${userTable.saldo_hold} - ${harga}`,
        })
        .where(eq(userTable.id, userId));

      await tx
        .update(transaksiTable)
        .set({ status: statusFinal })
        .where(eq(transaksiTable.reff_id, reffId));
    });

    m.reply(
      `❌ *TRANSAKSI GAGAL PUSAT*\n\nAlasan: ${alasan}\n💰 Saldo hold telah dikembalikan ke saldo utama.`,
    );
  } catch (e) {
    console.error("🚨 [CRITICAL_RELEASE_HOLD_ERROR]:", e.message);
  }
};
