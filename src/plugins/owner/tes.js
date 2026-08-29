import { buildCarouselMessage } from "#utils/carousel.js";
import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["tes"],
  description: "Tes kirim carousel",
  run: async ({ m, sock }) => {
    const msg = await buildCarouselMessage(sock, m.chat, {
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
              type: "url",
              label: "Order Sekarang",
              value: "https://kazuyatech.id",
            },
          ],
        },
      ],
    });

    await sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  },
});