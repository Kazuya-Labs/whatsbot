import { createPlugin } from "#utils/plugin.js";
import { settingsRepo } from "#storage/settings.js";
import { extractLinks } from "#utils/string.js";
import { deleteMessageFor } from "#utils/media.js";
import { parseArgs } from "#utils/args.js";

/** Intercept pesan berisi tautan saat antilink aktif. Return `true` = pesan dikonsumsi. */
export const onMessage = async (m, sock) => {
  if (!m.isGroup || m.isAdmin || m.isOwner) return;

  const settings = await settingsRepo.getSettings(m.chat);
  const cfg = settings.antilink;
  if (!cfg.enabled) return;

  const links = extractLinks(m.body, cfg.mode);
  if (links.length === 0) return;

  try {
    await deleteMessageFor(sock, m.key);
  } catch {
    // hapus bisa gagal bila bot bukan admin — lanjut
  }
  if (cfg.kick) {
    try {
      await sock.groupParticipantsUpdate(m.chat, [m.sender], "remove");
    } catch {
      // kick gagal — pesan tetap terhapus
    }
  }
  return true;
};

const statusText = (cfg) =>
  `*Antilink* — ${cfg.enabled ? "✅ aktif" : "⛔ nonaktif"}\n` +
  `• mode: ${cfg.mode === "all" ? "semua link" : "undangan grup"}\n` +
  `• kick: ${cfg.kick ? "ya (linker dikeluarkan)" : "hapus pesan saja"}\n\n` +
  "`.al on|off` · `.al mode invite|all` · `.al kick on|off`";

export default createPlugin({
  names: ["antilink", "al"],
  description: "Proteksi tautan: hapus pesan link (mode invite/all, opsional kick)",
  onMessage,
  run: async ({ m, sock }) => {
    const [sub, value] = parseArgs(m.text);
    const current = await settingsRepo.getSettings(m.chat);
    const cfg = current.antilink;

    const action = sub?.toLowerCase();
    if (action === "on" || action === "off") {
      const next = await settingsRepo.updateSettings(m.chat, {
        antilink: { enabled: action === "on" },
      });
      return m.reply(`✅ Antilink ${next.antilink.enabled ? "diaktifkan" : "dinonaktifkan"} untuk grup ini.`);
    }

    if (action === "mode") {
      if (!["invite", "all"].includes(value)) {
        return m.reply("Mode: `invite` (undangan grup) atau `all` (semua URL). Contoh: `.al mode all`");
      }
      const next = await settingsRepo.updateSettings(m.chat, {
        antilink: { mode: value },
      });
      return m.reply(`✅ Mode antilink: ${next.antilink.mode === "all" ? "semua link" : "undangan grup"}.`);
    }

    if (action === "kick") {
      if (!["on", "off"].includes(value)) {
        return m.reply("Format: `.al kick on|off`");
      }
      const next = await settingsRepo.updateSettings(m.chat, {
        antilink: { kick: value === "on" },
      });
      return m.reply(`✅ Kick saat antilink: ${next.antilink.kick ? "aktif" : "nonaktif"}.`);
    }

    return m.reply(statusText(cfg));
  },
});