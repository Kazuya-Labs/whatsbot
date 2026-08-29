import { buildCarouselMessage } from "#utils/carousel.js";
import logs from "#utils/logger.js";

const execute = async ({ m, sock }) => {
  try {
    const jid = m.chat;

    const msg = await buildCarouselMessage(sock, jid, {
      text: "🔥 Katalog Promo Top Up Minggu Ini",
      footer: "PPOB Store",
      cards: [
        {
          title: "Pulsa Telkomsel",
          body: "Diskon 5% semua nominal",
          imageUrl:
            "https://images.unsplash.com/photo-1587473555771-96aef0d968cc?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          buttons: [
            { type: "default", label: "Order Sekarang", id: "order_telkomsel" },
          ],
        },
        {
          title: "Pulsa Telkomsel",
          body: "Diskon 5% semua nominal",
          imageUrl:
            "https://images.unsplash.com/photo-1587473555771-96aef0d968cc?q=80&w=387&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
          buttons: [
            {
              type: "cta_url",
              label: "Order Sekarang",
              id: "order_telkomsel",
              url: "https://kazuyatech.id",
              mertchant_url: "https://kazuyatech.id",
            },
          ],
        },
      ],
    });

    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  } catch (error) {
    logs.error(error);
  }
};

export default {
  execute,
  names: ["tes"],
  isOwner: true,
};