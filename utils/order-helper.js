import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import ppob from "./gateway.js";

const userLocks = new Set();

export const createOrderSecure = async (
  m,
  phoneUser,
  kodeProduk,
  nomorTujuan,
  hargaProduk,
  isMultiOrder = false,
) => {
  if (userLocks.has(phoneUser)) {
    if (process.env.DEBUG)
      console.log(
        `-> [DEBUG-LOCK] User ${phoneUser} terkunci transaksi sebelumnya.`,
      );
    return m.reply(
      "⏳ Transaksi Anda sebelumnya sedang diproses. Mohon tunggu!",
    );
  }
  userLocks.add(phoneUser);

  const reffId = `TRX${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    if (process.env.DEBUG)
      console.log(
        `-> [DEBUG-ORDER] Memulai database check untuk ${phoneUser} -> ${kodeProduk}.${nomorTujuan}`,
      );
    let successCreatedTrx = null;

    const userTable = db._.fullSchema.user;
    const transaksiTable = db._.fullSchema.transaksi;

    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.phone, phoneUser))
      .get();

    if (!user) throw new Error("USER_NOT_FOUND");
    if (user.saldo < hargaProduk) throw new Error("INSUFFICIENT_BALANCE");

    db.transaction((tx) => {
      const updatedUser = tx
        .update(userTable)
        .set({
          saldo: sql`${userTable.saldo} - ${hargaProduk}`,
          saldo_hold: sql`${userTable.saldo_hold} + ${hargaProduk}`,
        })
        .where(
          and(
            eq(userTable.phone, phoneUser),
            gte(userTable.saldo, hargaProduk),
          ),
        )
        .returning()
        .get();

      if (!updatedUser) throw new Error("RACE_CONDITION_DETECTED");

      successCreatedTrx = tx
        .insert(transaksiTable)
        .values({
          reff_id: reffId,
          user_id: user.id,
          produk: kodeProduk,
          tujuan: nomorTujuan,
          harga: hargaProduk,
          status: "pending",
        })
        .returning()
        .get();
    });

    if (!successCreatedTrx) throw new Error("FAILED_TO_SAVE_TRX");

    if (!isMultiOrder) {
      if (process.env.DEBUG)
        console.log(
          `-> [DEBUG-REPLY] Mengirim teks info hold untuk order tunggal.`,
        );
      // await m.reply(
      //   `⏳ *TRANSAKSI DIPROSES*\n\nSaldo Anda sebesar Rp ${hargaProduk.toLocaleString("id-ID")} telah dibekukan sementara untuk transaksi ini.\nRefID: \`${reffId}\``,
      //   false,
      // );
      //
      await m.react();
    } else {
      if (process.env.DEBUG)
        console.log(
          `-> [DEBUG-SILENT] Transaksi diproses senyap (Mode Multi-Order) untuk RefID: ${reffId}`,
        );
    }

    if (process.env.DEBUG)
      console.log(
        `-> [DEBUG-GATEWAY] Menghubungi API PPOB untuk RefID: ${reffId}`,
      );
    const apiResponse = await ppob.create_trx(reffId, kodeProduk, nomorTujuan);

    if (!apiResponse || apiResponse.status === false) {
      throw new Error(
        `GATEWAY_REJECTED: ${apiResponse?.message || "Gangguan produk"}`,
      );
    }

    return { success: true, reffId };
  } catch (error) {
    if (process.env.DEBUG)
      console.error(
        "💥 [DEBUG-ERROR] Gagal pada createOrderSecure:",
        error.message,
      );

    if (error.message.startsWith("GATEWAY_REJECTED")) {
      const rincian = error.message.replace("GATEWAY_REJECTED: ", "");
      await releaseHoldSaldo(
        phoneUser,
        hargaProduk,
        reffId,
        "failed",
        rincian,
        isMultiOrder ? null : m,
      );
      throw new Error(rincian);
    } else if (error.message === "INSUFFICIENT_BALANCE") {
      if (!isMultiOrder)
        m.reply("❌ Transaksi gagal! Saldo Anda tidak mencukupi.");
      throw new Error("SALDO_TIDAK_CUKUP");
    } else {
      if (!isMultiOrder) m.reply("❌ Terjadi kesalahan internal sistem.");
      throw new Error(error.message);
    }
  } finally {
    userLocks.delete(phoneUser);
  }
};

const releaseHoldSaldo = async (
  phoneUser,
  harga,
  reffId,
  statusFinal,
  alasan,
  m,
) => {
  try {
    const userTable = db._.fullSchema.user;
    const transaksiTable = db._.fullSchema.transaksi;

    db.transaction((tx) => {
      tx.update(userTable)
        .set({
          saldo: sql`${userTable.saldo} + ${harga}`,
          saldo_hold: sql`${userTable.saldo_hold} - ${harga}`,
        })
        .where(eq(userTable.phone, phoneUser))
        .run();

      tx.update(transaksiTable)
        .set({ status: statusFinal })
        .where(eq(transaksiTable.reff_id, reffId))
        .run();
    });

    if (m) {
      m.reply(
        `❌ *TRANSAKSI GAGAL PUSAT*\n\nAlasan: ${alasan}\n💰 Saldo hold telah dikembalikan ke saldo utama.`,
      );
    }
  } catch (e) {
    console.error("🚨 [CRITICAL_RELEASE_HOLD_ERROR]:", e.message);
  }
};
