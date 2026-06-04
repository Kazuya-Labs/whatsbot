import { Database } from "../utils/db-helper.js";
import ppob from "../utils/gateway.js";

const userService = new Database("user"); // Hubungkan ke tabel user di SQLite

const execute = async ({ m, isOwner }) => {
  try {
    let namaUser = m.name;
    let statusUser = "Aktif";
    let pointUser = 0;
    let saldoUser = 0;
    let tipeAkun = "User Biasa";

    // 🛠️ LOGIKA 1: Jika Pengirim adalah OWNER (Ambil dari API Gateway Ppob)
    if (isOwner) {
      const { data } = await ppob.profile();
      namaUser = data.nama || m.name;
      statusUser = data.aktif ? "Aktif" : "Non-Aktif";
      pointUser = data.point || 0;
      saldoUser = data.saldo || 0;
      tipeAkun = "Owner (Pusat)";
    }
    // 🛠️ LOGIKA 2: Jika Pengirim adalah USER BIASA (Ambil dari Database SQLite)
    else {
      // Cari data user berdasarkan nomor WhatsApp (m.sender)
      const userData = await userService
        .query()
        .where((table, { eq }) => eq(table.phone, m.sender.split("@")[0]))
        .get();

      if (!userData) {
        return m.reply("❌ Akun Anda belum terdaftar di sistem database bot.");
      }

      saldoUser = userData.saldo || 0;
      // Kolom lain bisa disesuaikan atau dibuat default statis jika belum ada di tabel SQLite
    }

    // Susun template pesan text wrap
    const text_wrap = `👤 *PROFIL AKUN* (${tipeAkun})
    
▪️ Nama : ${namaUser}
▪️ Status : ${statusUser}
▪️ Point : ${pointUser}
▪️ Saldo Tersedia : Rp ${saldoUser.toLocaleString("id-ID")}`;

    await m.reply(text_wrap.trim());
  } catch (error) {
    console.error("Error cek-saldo:", error);
    m.reply("❌ Terjadi kesalahan saat memproses pengecekan saldo.");
  }
};

export default {
  names: ["cek-saldo", "profile"],
  execute,
};
