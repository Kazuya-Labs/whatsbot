import { eq } from "drizzle-orm";
import { Database } from "../utils/db-helper.js";
import ppob from "../utils/gateway.js";

const userService = new Database("user");
const transaksiService = new Database("transaksi");

const execute = async ({ m, isOwner }) => {
  try {
    let saldoUser = 0;
    let userIdText = "";
    let totalTransaksiHariIni = 0;
    let totalNominalHariIni = 0;

    const todayStr = new Date().toISOString().split(" ")[0];
    const data_trx = (await transaksiService.query()) || [];

    if (isOwner) {
      const { data } = await ppob.profile();
      saldoUser = data.saldo || 0;
      userIdText = "OWNER";

      const filteredTrx = data_trx.filter((trx) => {
        if (!trx.created_at) return false;
        const trxDate = trx.created_at.split(" ")[0];
        return trxDate === todayStr && trx.status === "success";
      });

      totalTransaksiHariIni = filteredTrx.length;
      totalNominalHariIni = filteredTrx.reduce(
        (sum, trx) => sum + (trx.harga || 0),
        0,
      );
    } else {
      const parseNumber = m.senderJid.split("@")[0];

      const userData = await userService
        .query()
        .where(eq(userService.table.phone, parseNumber))
        .get();

      if (!userData) {
        return m.reply("❌ Akun Anda belum terdaftar di sistem database bot.");
      }

      saldoUser = userData.saldo || 0;
      userIdText = userData.id || parseNumber;

      const filteredTrx = data_trx.filter((trx) => {
        if (!trx.created_at) return false;
        const trxDate = trx.created_at.split(" ")[0];
        return (
          trxDate === todayStr &&
          trx.user_id === userData.id &&
          trx.status === "success"
        );
      });

      totalTransaksiHariIni = filteredTrx.length;
      totalNominalHariIni = filteredTrx.reduce(
        (sum, trx) => sum + (trx.harga || 0),
        0,
      );
    }

    const text_wrap = `💸 ɪɴғᴏʀᴍᴀsɪ sᴀʟᴅᴏ

🆔 ɪᴅ: ${userIdText}
💰 sᴀʟᴅᴏ: Rp ${saldoUser.toLocaleString("id-ID")}

🚀 ᴛᴏᴛᴀʟ ᴘᴇᴍᴀᴋᴀɪᴀɴ ʜᴀʀɪ ɪɴɪ

Rp ${totalNominalHariIni.toLocaleString("id-ID")} (${totalTransaksiHariIni} ᴛʀᴀɴsᴀᴋsɪ)

━━━━━━━━━━━━━━━

🤩sɪʟᴀᴋᴀɴ ᴄʜᴀᴛ ᴍɪᴍɪɴ ᴜɴᴛᴜᴋ ᴅᴇᴘᴏsɪᴛ
☎️ 087875704129

✨ ᴛᴇʀɪᴍᴀ ᴋᴀsɪʜ ᴛᴇʟᴀʜ ᴍᴇɴɢɢᴜɴᴀᴋᴀɴ ʟᴀʏᴀɴᴀɴ ᴋᴀᴍɪ
🩵 sᴇᴍᴏɢᴀ sᴜᴋsᴇs sᴇʟᴀʟᴜ!`;

    await m.reply(text_wrap.trim());
  } catch (error) {
    console.error("Error cek-saldo:", error);
    m.reply("❌ Terjadi kesalahan saat memproses pengecekan saldo.");
  }
};

export default {
  names: ["saldo"],
  execute,
};
