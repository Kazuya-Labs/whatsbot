import { addTarget, getCampaign } from "#storage/campaigns.js";

const execute = async ({ m, sock }) => {
  try {
    let [campaignId, groupJid] = m.text.split("|").map((v) => v?.trim());

    if (!campaignId) {
      return m.reply(
        "Format salah!\n\n*Cara penggunaan:*\n.addidblast <campaign_id> | <id_grup>\n\n*Contoh:*\n.addidblast promo_landing_juli | 120363407878622278@g.us\n\n_(Jika <id_grup> dikosongkan saat command dipakai di dalam grup, bot akan otomatis menambahkan ID grup ini)_",
      );
    }

    // Jika groupJid tidak diisi, otomatis gunakan ID chat/grup tempat pesan dikirim
    if (!groupJid) {
      groupJid = m.chat;
    }

    // Validasi: yang ditambahkan harus ID grup WhatsApp (@g.us)
    if (!groupJid.endsWith("@g.us")) {
      return m.reply(
        `Gagal! ID "${groupJid}" bukan merupakan ID Grup WhatsApp yang valid (@g.us).`,
      );
    }

    // Validasi ketersediaan campaign
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      return m.reply(
        `Campaign dengan ID "${campaignId}" tidak ditemukan di database.`,
      );
    }

    // Validasi duplikat
    if (campaign.targets.includes(groupJid)) {
      return m.reply(
        `ID Grup ${groupJid} sudah ada di dalam daftar target campaign "${campaignId}".`,
      );
    }

    const { ok } = await addTarget(campaignId, groupJid);
    if (!ok) {
      return m.reply("Terjadi kesalahan pada sistem saat mencoba menyimpan data.");
    }

    m.reply(
      `✅ *Berhasil!*\n\nID Grup: ${groupJid}\nTelah ditambahkan ke campaign: *${campaignId}*\n\nTotal target saat ini: ${campaign.targets.length + 1} grup.`,
    );
  } catch (error) {
    console.error("Gagal menambahkan ID ke autoblast:", error);
    m.reply("Terjadi kesalahan pada sistem saat mencoba menyimpan data.");
  }
};

export default {
  execute,
  names: ["addidblast", "addtargetblast"],
  isOwner: true,
};