import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["sub", "setjudul", "setnama", "setgcnama"],
  description: "Set nama/judul grup (.sub <nama>)",
  run: async ({ m, sock }) => {
    const text = String(m.text ?? "").trim();
    if (!text) return m.reply("Format: `.sub <nama grup baru>`");
    try {
      await sock.groupUpdateSubject(m.chat, text);
      return m.reply("✅ Nama grup diperbarui.");
    } catch (error) {
      return m.reply(`Gagal set nama grup: ${error.message}`);
    }
  },
});