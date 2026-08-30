import { createPlugin } from "#utils/plugin.js";
import { resolveTargetJids } from "./utils/targets.js";

export default createPlugin({
  names: ["kick", "tendang", "out"],
  description: "Keluarkan member (reply pesannya / mention / ketik nomor)",
  run: async ({ m, sock }) => {
    const targets = resolveTargetJids(m);
    if (targets.length === 0) {
      return m.reply("Reply pesan target, mention, atau ketik nomornya. Contoh: `.kick 628xxx`");
    }

    try {
      const results = await sock.groupParticipantsUpdate(m.chat, targets, "remove");
      const failed = results.filter((r) => r.status !== "200").map((r) => r.jid);
      const ok = results.length - failed.length;
      return m.reply(
        `✅ ${ok} dikeluarkan.${failed.length ? `\n❌ Gagal: ${failed.join(", ")}` : ""}`,
      );
    } catch (error) {
      return m.reply(`Gagal kick: ${error.message}`);
    }
  },
});