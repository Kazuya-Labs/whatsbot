import { createPlugin } from "#utils/plugin.js";
import { resolveTargetJids } from "./utils/targets.js";
import { jidToUserNumber } from "#utils/jid.js";
import { isOwner } from "#utils/config.js";

/**
 * Cek apakah target boleh dikick oleh `m`. Blokir: sesama admin/superadmin,
 * owner, diri sendiri, dan bot.
 *
 * @param {object} m - objek pesan
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} target - JID target
 * @returns {string|null} alasan blokir, atau null bila boleh dikick
 */
const kickBlockReason = (m, sock, target) => {
  const targetUser = jidToUserNumber(target);

  const botUser = jidToUserNumber(sock.user?.id);
  if (botUser && targetUser === botUser) {
    return "bot itu sendiri";
  }

  if (targetUser && isOwner(targetUser)) {
    return "owner bot";
  }

  const senderUser = jidToUserNumber(m.sender);
  if (senderUser && targetUser === senderUser) {
    return "diri sendiri";
  }

  const participant = m.metadata?.participants?.find((p) => {
    const pUser = jidToUserNumber(p.id);
    return pUser === targetUser;
  });
  if (participant?.admin || participant?.superadmin) {
    return "sesama admin";
  }

  return null;
};

export default createPlugin({
  names: ["kick", "tendang", "out"],
  description: "Keluarkan member (reply pesannya / mention / ketik nomor)",
  run: async ({ m, sock }) => {
    const targets = resolveTargetJids(m);
    if (targets.length === 0) {
      return m.reply("Reply pesan target, mention, atau ketik nomornya. Contoh: `.kick 628xxx`");
    }

    const allowed = [];
    const blocked = [];

    for (const target of targets) {
      const reason = kickBlockReason(m, sock, target);
      if (reason) {
        blocked.push(`${jidToUserNumber(target) || target} (${reason})`);
      } else {
        allowed.push(target);
      }
    }

    if (blocked.length) {
      await m.reply(`⛔ Tidak bisa mengeluarkan:\n${blocked.join("\n")}`);
    }
    if (allowed.length === 0) return;

    try {
      const results = await sock.groupParticipantsUpdate(m.chat, allowed, "remove");
      const failed = results.filter((r) => r.status !== "200").map((r) => jidToUserNumber(r.jid) || r.jid);
      const ok = results.length - failed.length;
      return m.reply(
        `✅ ${ok} dikeluarkan.${failed.length ? `\n❌ Gagal: ${failed.join(", ")}` : ""}`,
      );
    } catch (error) {
      return m.reply(`Gagal kick: ${error.message}`);
    }
  },
});
