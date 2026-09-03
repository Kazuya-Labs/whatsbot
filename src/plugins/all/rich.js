import { createPlugin } from "#utils/plugin.js";
import {
  sendRichTable,
  sendRichCode,
  sendRichText,
} from "#utils/richMessage.js";

export default createPlugin({
  names: ["rich", "richmsg"],
  description:
    "Demo rich message (Meta AI-style). Sub: table | code | text. Catatan: eksperimental, bisa gagal dirender klien lama.",
  run: async ({ m, sock }) => {
    const cmd = m.text.split(/\s+/)[0]?.toLowerCase();

    try {
      switch (cmd) {
        case "table":
          return await sendRichTable(sock, m.chat, {
            title: "📊 *Penjualan Mingguan*",
            headers: ["Item", "Qty", "Harga"],
            rows: [
              ["Apel", 3, "1.5"],
              ["Mangga", 6, "2.0"],
              ["Jeruk", 9, "1.2"],
            ],
            quoted: m.quoted,
          });
        case "code":
          return await sendRichCode(
            sock,
            m.chat,
            'const greet = (name) => {\n  console.log(`Halo ${name}`);\n};\n\ngreet("Dunia");',
            { language: "javascript", quoted: m.quoted },
          );
        case "text":
          return await sendRichText(
            sock,
            m.chat,
            "*Contoh rich text*\n_bisa pakai format WhatsApp_ dan juga\n`monospace`.",
            { quoted: m.quoted },
          );
        default:
          return m.reply(
            "Demo *rich message* (Meta AI-style, eksperimental).\n\n" +
              "Gunakan:\n" +
              "• `!rich table` — tabel rich\n" +
              "• `!rich code` — blok kode ber-highlight\n" +
              "• `!rich text` — teks rich\n\n" +
              "_⚠️ Fitur ini menulis proto `AIRichResponse*` langsung. " +
              "Bukan HTML. Bisa gagal dirender / ditolak WhatsApp di " +
              "beberapa klien karena normalnya hanya untuk akun bot Meta AI._",
          );
      }
    } catch (error) {
      return m.reply(`⚠️ Rich message gagal: ${error.message}`);
    }
  },
});
