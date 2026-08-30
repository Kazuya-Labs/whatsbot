import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["desc", "setdesc", "setinfo"],
  description: "Set deskripsi grup (.desc <teks>; tanpa teks = kosongkan)",
  run: async ({ m, sock }) => {
    const text = String(m.text ?? "").trim();
    try {
      await sock.groupUpdateDescription(m.chat, text || undefined);
      return m.reply(text ? "✅ Deskripsi grup diperbarui." : "✅ Deskripsi grup dikosongkan.");
    } catch (error) {
      return m.reply(`Gagal set deskripsi: ${error.message}`);
    }
  },
});