import { addTarget, getCampaign } from "#storage/campaigns.js";
import { createPlugin } from "#utils/plugin.js";
import { parseArgs } from "#utils/args.js";

export default createPlugin({
  names: ["addidblast", "addtargetblast"],
  description: "Tambah ID grup ke campaign target",
  run: async ({ m }) => {
    const [campaignId, groupJid = m.chat] = parseArgs(m.text, "|");

    if (!campaignId) {
      return m.reply(
        "Format salah!\n\n*Cara penggunaan:*\n.addidblast <campaign_id> | <id_grup>\n\n*Contoh:*\n.addidblast promo_landing_juli | 120363407878622278@g.us\n\n_(Jika <id_grup> dikosongkan saat command dipakai di dalam grup, bot akan otomatis menambahkan ID grup ini)_",
      );
    }

    if (!groupJid.endsWith("@g.us")) {
      return m.reply(
        `Gagal! ID "${groupJid}" bukan merupakan ID Grup WhatsApp yang valid (@g.us).`,
      );
    }

    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      return m.reply(
        `Campaign dengan ID "${campaignId}" tidak ditemukan di database.`,
      );
    }

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
  },
});