import { Database } from "../utils/db-helper.js";

// Inisialisasi service untuk tabel transaksi
const transaksiService = new Database("transaksi");

const execute = async ({ m }) => {
  try {
    // 🛠️ Mengambil semua data transaksi menggunakan query builder dari Class Database
    const data_db = await transaksiService.query();

    console.log({ data_db });

    if (!data_db || data_db.length === 0) {
      return m.reply("📂 Belum ada data transaksi di database.");
    }

    // Susun teks daftar transaksi agar rapi saat dibaca di WhatsApp
    let txt = "🧾 *DAFTAR TRANSAKSI BOT*\n\n";
    data_db.forEach((trx, i) => {
      txt += `${i + 1}. *ID:* ${trx.id}\n`;
      txt += `   ▪️ *Reff:* ${trx.reff_id}\n`;
      txt += `   ▪️ *Produk:* ${trx.produk}\n`;
      txt += `   ▪️ *Tujuan:* ${trx.tujuan}\n`;
      txt += `   ▪️ *Harga:* Rp ${trx.harga.toLocaleString("id-ID")}\n`;
      txt += `   ▪️ *Status:* ${trx.status === "success" ? "✅" : trx.status === "pending" ? "⏳" : "❌"} ${trx.status}\n\n`;
    });

    await m.reply(txt.trim());
  } catch (err) {
    console.error("Error in listtrx plugin:", err);
    m.reply("❌ Terjadi kesalahan saat mengambil daftar transaksi.");
  }
};

export default {
  names: ["listtrx"],
  execute,
};
