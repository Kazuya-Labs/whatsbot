import path from "node:path";
import fs from "node:fs/promises";

// Sesuaikan path dengan letak file JSON Anda
const dirpath = path.join(process.cwd(), "src", "storage", "autoblast.json");

const execute = async ({ m, sock }) => {
  try {
    // Memisahkan input berdasarkan pemisah "|"
    let [campaignId, groupJid] = m.text.split("|").map((v) => v?.trim());

    if (!campaignId) {
      return m.reply(
        "Format salah!\n\n*Cara penggunaan:*\n.addidblast <campaign_id> | <id_grup>\n\n*Contoh:*\n.addidblast promo_landing_juli | 120363407878622278@g.us\n\n_(Jika <id_grup> dikosongkan saat command dipakai di dalam grup, bot akan otomatis menambahkan ID grup ini)_",
      );
    }

    // Jika groupJid tidak diisi secara manual, otomatis gunakan ID chat/grup tempat pesan ini dikirim
    if (!groupJid) {
      groupJid = m.chat;
    }

    // (Opsional) Validasi memastikan yang ditambahkan adalah ID grup WhatsApp (@g.us)
    if (!groupJid.endsWith("@g.us")) {
      return m.reply(
        `Gagal! ID "${groupJid}" bukan merupakan ID Grup WhatsApp yang valid (@g.us).`,
      );
    }

    // 1. Baca file autoblast.json
    const raw = await fs.readFile(dirpath, "utf-8");
    const db = JSON.parse(raw);

    // 2. Validasi apakah campaign_id yang diinput ada di database
    if (!db.campaigns[campaignId]) {
      return m.reply(
        `Campaign dengan ID "${campaignId}" tidak ditemukan di database.`,
      );
    }

    // 3. Validasi apakah ID grup sudah pernah dimasukkan sebelumnya (mencegah duplikat)
    if (db.campaigns[campaignId].targets.includes(groupJid)) {
      return m.reply(
        `ID Grup ${groupJid} sudah ada di dalam daftar target campaign "${campaignId}".`,
      );
    }

    // 4. Masukkan ID grup baru ke dalam array targets
    db.campaigns[campaignId].targets.push(groupJid);

    // 5. Simpan dan tulis ulang perubahan ke dalam file JSON
    await fs.writeFile(dirpath, JSON.stringify(db, null, 2), "utf-8");

    m.reply(
      `✅ *Berhasil!*\n\nID Grup: ${groupJid}\nTelah ditambahkan ke campaign: *${campaignId}*\n\nTotal target saat ini: ${db.campaigns[campaignId].targets.length} grup.`,
    );
  } catch (error) {
    console.error("Gagal menambahkan ID ke Autoblast:", error);
    m.reply("Terjadi kesalahan pada sistem saat mencoba menyimpan data.");
  }
};

export default {
  execute,
  names: ["addidblast", "addtargetblast"],
  isOwner: true,
};
