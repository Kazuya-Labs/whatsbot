import { createPlugin } from "#utils/plugin.js";
import { resolveTargetJids } from "./utils/targets.js";

export default createPlugin({
  names: ["promote", "naikadmin", "ngadm"],
  description: "Jadikan member sebagai admin grup",
  run: async ({ m, sock }) => {
    const targets = resolveTargetJids(m);
    if (targets.length === 0) {
      return m.reply("Reply pesan target, mention, atau ketik nomornya. Contoh: `.promote 628xxx`");
    }

    try {
      const results = await sock.groupParticipantsUpdate(m.chat, targets, "promote");
      const ok = results.filter((r) => r.status === "200").length;
      return m.reply(
        `✅ ${ok}/${targets.length} dipromosikan.${ok < targets.length ? "\n⚠️ Sebagian gagal (cek akses bot)." : ""}`,
      );
    } catch (error) {
      return m.reply(`Gagal promote: ${error.message}`);
    }
  },
});