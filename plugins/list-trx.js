import { Database } from "../utils/db-helper.js";

const transaksiService = new Database("transaksi");
const userService = new Database("user");

const execute = async ({ m, isOwner }) => {
  try {
    const data_db = await transaksiService.query();

    if (!data_db || data_db.length === 0) {
      return m.reply("📂 *Belum ada data transaksi di database.*");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let userRecord = null;

    if (!isOwner) {
      const users = await userService.query();
      const senderPhone = m.senderJid.split("@")[0];
      userRecord = users.find((u) => u.phone === senderPhone);
      if (!userRecord) {
        return m.reply("📂 *Data pengguna tidak ditemukan di database.*");
      }
    }

    const filteredTransactions = data_db.filter((trx) => {
      if (!trx.created_at || !trx.created_at.startsWith(todayStr)) return false;
      if (isOwner) return true;
      return trx.user_id === userRecord.id;
    });

    if (filteredTransactions.length === 0) {
      return m.reply("📂 *Tidak ada riwayat transaksi untuk hari ini.*");
    }

    // Hitung ringkasan statistik harian
    let totalSuccessCount = 0;
    let totalSuccessAmount = 0;
    let totalFailedCount = 0;
    let totalFailedAmount = 0;

    let txt = "📊 ʜɪsᴛᴏʀʏ ᴛʀᴀɴsᴀᴋsɪ ʜᴀʀɪ ɪɴɪ\n\n━━━━━━━━━━━━━━━━━━\n\n";

    filteredTransactions.forEach((trx) => {
      const isSuccess = trx.status === "success";
      const isFailed = trx.status === "failed";

      if (isSuccess) {
        totalSuccessCount++;
        totalSuccessAmount += trx.harga;
      } else if (isFailed) {
        totalFailedCount++;
        totalFailedAmount += trx.harga;
      }

      const statusIndicator = isSuccess
        ? "✅ succes"
        : trx.status === "pending"
          ? "⏳ pending"
          : "❌ failed";

      // Ambil bagian jam dan menit saja (HH:MM)
      const dateTimeParts = trx.created_at.split(" ");
      const timeParts = dateTimeParts[1]?.split(":") || ["00", "00"];
      const hourMinute = `${timeParts[0]}:${timeParts[1]}`;

      txt += `• ${trx.produk} - ${trx.tujuan} - Rp ${trx.harga.toLocaleString("id-ID")} | ${hourMinute} ➜ ${statusIndicator}\n`;
    });

    txt += `\n\n📈 ʀɪɴɢᴋᴀsᴀɴ\n\n📦 ᴛᴏᴛᴀʟ ᴛʀᴀɴsᴀᴋsɪ : ${filteredTransactions.length}x\n\n`;
    txt += `✅ sᴜᴄᴄᴇss : ${totalSuccessCount}x\n💵 Rp ${totalSuccessAmount.toLocaleString("id-ID")}\n\n`;
    txt += `❌ ғᴀɪʟᴇᴅ : ${totalFailedCount}x\n💸 Rp ${totalFailedAmount.toLocaleString("id-ID")}\n\n`;
    txt +=
      "━━━━━━━━━━━━━━━━━━\n\n🚀 ᴛᴇʀɪᴍᴀ ᴋᴀsɪʜ ᴛᴇʟᴀʜ ᴍᴇᴍᴘᴇʀᴄᴀʏᴀɪ ʟᴀʏᴀɴᴀɴ ᴋᴀᴍɪ\n🩵 sᴇᴍᴏɢᴀ sᴜᴋsᴇs sᴇʟᴀʟᴜ!";

    await m.reply(txt.trim());
  } catch (err) {
    console.error("Error in listtrx plugin:", err);
    m.reply("❌ *Terjadi kesalahan sistem saat mengambil daftar transaksi.*");
  }
};

export default {
  names: ["listtrx", "history"],
  execute,
};
