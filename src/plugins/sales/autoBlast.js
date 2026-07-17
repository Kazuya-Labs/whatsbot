import path from "node:path";
import fs from "node:fs/promises";
import delay from "delay";
import { buildCarouselMessage } from "../../utils/carrouselMessage.js";

const dirpath = path.join(process.cwd(), "src", "storage", "autoblast.json");

const execute = async ({ m, sock }) => {
  try {
    const [id, jedaOverride] = m.text.split("|").map((v) => v.trim());
    if (!id) return m.reply("Format: .blast <campaign_id> | <jeda_ms opsional>");

    const raw = await fs.readFile(dirpath, "utf-8");
    const { campaigns } = JSON.parse(raw);
    const campaign = campaigns[id];

    if (!campaign) return m.reply(`Campaign "${id}" nggak ditemukan.`);
    if (!campaign.enabled) return m.reply(`Campaign "${id}" sedang nonaktif.`);

    const jeda = Number(jedaOverride) || campaign.jeda || 5000;

    for (const jid of campaign.targets) {
      try {
        const msg = await buildCarouselMessage(sock, jid, {
          text: campaign.text,
          footer: campaign.footer,
          cards: campaign.cards,
        });
        await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
        await delay(jeda); // jeda antar grup, penting buat hindari ban
      } catch (err) {
        console.error(`Gagal kirim ke ${jid}:`, err);
        // lanjut ke grup berikutnya, jangan berhenti total kalau satu gagal
      }
    }
    await delay(2000)
    m.reply(`Blast "${id}" selesai ke ${campaign.targets.length} grup.`);
  } catch (error) {
    console.error(error);
  }
};

export default { execute, names: ["blast"], isOwner: true };