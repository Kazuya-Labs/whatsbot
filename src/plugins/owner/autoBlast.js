import delay from "delay";
import { getCampaign } from "#storage/campaigns.js";
import { buildCarouselMessage } from "#utils/carousel.js";
import { createPlugin } from "#utils/plugin.js";
import { num, parseArgs } from "#utils/args.js";
import { getConfig } from "#utils/config.js";

export default createPlugin({
  names: ["blast"],
  description: "Blast campaign ke semua target",
  run: async ({ m, sock }) => {
    const [id, jedaOverride] = parseArgs(m.text, "|");
    if (!id) return m.reply("Format: .blast <campaign_id> | <jeda_ms opsional>");

    const campaign = await getCampaign(id);

    if (!campaign) return m.reply(`Campaign "${id}" nggak ditemukan.`);
    if (!campaign.enabled) return m.reply(`Campaign "${id}" sedang nonaktif.`);

    const jeda = num(jedaOverride, campaign.jeda ?? getConfig().bot?.defaultJeda ?? 5000);

    for (const jid of campaign.targets) {
      try {
        const msg = await buildCarouselMessage(sock, jid, {
          text: campaign.text,
          footer: campaign.footer,
          cards: campaign.cards,
        });
        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
        await delay(jeda);
      } catch (err) {
        console.error(`Gagal kirim ke ${jid}:`, err);
      }
    }
    await delay(2000);
    m.reply(`Blast "${id}" selesai ke ${campaign.targets.length} grup.`);
  },
});