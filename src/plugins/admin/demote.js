import { createPlugin } from "#utils/plugin.js";
import { resolveTargetJids } from "./utils/targets.js";

export default createPlugin({
  names: ["demote", "turunkan", "ngadm2"],
  description: "Turunkan admin menjadi member",
  run: async ({ m, sock }) => {
    const targets = resolveTargetJids(m);
    if (targets.length === 0) {
      return m.reply("Reply pesan target, mention, atau ketik nomornya. Contoh: `.demote 628xxx`");
    }

    try {
      const results = await sock.groupParticipantsUpdate(m.chat, targets, "demote");
      const ok = results.filter((r) => r.status === "200").length;
      return m.reply(
        `✅ ${ok}/${targets.length} diturunkan.${ok < targets.length ? "\n⚠️ Sebagian gagal (cek akses bot)." : ""}`,
      );
    } catch (error) {
      return m.reply(`Gagal demote: ${error.message}`);
    }
  },
});