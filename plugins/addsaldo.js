import { sql } from "drizzle-orm";
import { Database } from "../utils/db-helper.js";

const userService = new Database("user");

const execute = async ({ m }) => {
  try {
    const args = m.text?.split(" ") || [];
    const flag = args[1];

    if (!flag || !flag.includes("|")) {
      return m.reply(
        "❌ Format salah! Gunakan: *!addsaldo ID_USER|JUMLAH* (Contoh: !addsaldo 62xxxx|50000)",
      );
    }

    const [nomor, ammount] = flag.split("|");
    const cleanNomor = nomor.trim();
    const convert = Number(ammount);

    if (isNaN(convert) || convert <= 0) {
      return m.reply(
        "❌ Jumlah saldo harus berupa angka yang valid dan lebih dari 0!",
      );
    }

    const result = await userService
      .customUpdate()
      .set({
        saldo: sql`${userService.table.saldo} + ${convert}`,
      })
      .where(sql`${userService.table.phone} = ${cleanNomor}`)
      .returning();

    if (!result || result.length === 0) {
      return m.reply("❌ Gagal menambah saldo. User tidak ditemukan!");
    }

    const updatedUser = result[0];
    m.reply(
      `✅ Berhasil menambah saldo sebesar *Rp ${convert.toLocaleString("id-ID")}* ke User ID ${cleanNomor}.\n\n*Saldo Sekarang:* Rp ${updatedUser.saldo.toLocaleString("id-ID")}`,
    );
  } catch (err) {
    console.error("Error in addsaldo plugin:", err);
    m.reply("❌ Terjadi kesalahan internal saat menambah saldo.");
  }
};

export default {
  names: ["addsaldo"],
  execute,
  owner: true,
};
