import { createPlugin } from "#utils/plugin.js";
import { settingsRepo } from "#storage/settings.js";
import { hasBadWord } from "#utils/string.js";
import { deleteMessageFor } from "#utils/media.js";
import { parseArgs } from "#utils/args.js";

/** Intercept pesan berisi kata terlarang saat filter aktif. Return `true` = konsumsi. */
export const onMessage = async (m, sock) => {
  if (!m.isGroup || m.isAdmin || m.isOwner) return;

  const settings = await settingsRepo.getSettings(m.chat);
  const cfg = settings.badword;
  if (!cfg.enabled || cfg.words.length === 0) return;
  if (!hasBadWord(m.body, cfg.words)) return;

  try {
    await deleteMessageFor(sock, m.key);
  } catch {
    // hapus bisa gagal bila bot bukan admin — lanjut
  }
  await m.reply(`⚠️ *Badword!* Jangan pakai kata terlarang di grup ini.`, {
    contextInfo: { mentionedJid: [m.sender] },
  });
  return true;
};

export default createPlugin({
  names: ["badword", "bw"],
  description: "Filter kata terlarang: add/del/list/on/off",
  onMessage,
  run: async ({ m }) => {
    const [sub, ...rest] = parseArgs(m.text);
    const word = rest.join(" ");
    const action = sub?.toLowerCase();

    if (action === "on" || action === "off") {
      const next = await settingsRepo.updateSettings(m.chat, {
        badword: { enabled: action === "on" },
      });
      return m.reply(`✅ Filter badword ${next.badword.enabled ? "diaktifkan" : "dinonaktifkan"}.`);
    }

    if (action === "add") {
      if (!word) return m.reply("Format: `.bw add <kata>`");
      const words = (await settingsRepo.getSettings(m.chat)).badword.words;
      if (words.includes(word.toLowerCase()))
        return m.reply("Kata itu sudah ada di daftar.");
      const next = await settingsRepo.updateSettings(m.chat, {
        badword: { words: [...words, word.toLowerCase()] },
      });
      return m.reply(`✅ Kata *"${word}"* ditambahkan. Total: ${next.badword.words.length}.`);
    }

    if (action === "del") {
      if (!word) return m.reply("Format: `.bw del <kata>`");
      const words = (await settingsRepo.getSettings(m.chat)).badword.words;
      const next = await settingsRepo.updateSettings(m.chat, {
        badword: { words: words.filter((w) => w !== word.toLowerCase()) },
      });
      return m.reply(`✅ Kata *"${word}"* dihapus. Total: ${next.badword.words.length}.`);
    }

    if (action === "list") {
      const current = await settingsRepo.getSettings(m.chat);
      const words = current.badword.words;
      return m.reply(
        `*Daftar badword* (${words.length})\n` +
          (words.length ? words.map((w, i) => `${i + 1}. ${w}`).join("\n") : "_(kosong)_"),
      );
    }

    const current = await settingsRepo.getSettings(m.chat);
    return m.reply(
      `*Badword* — ${current.badword.enabled ? "✅ aktif" : "⛔ nonaktif"} (${current.badword.words.length} kata)\n\n` +
        "`.bw add <kata>` · `.bw del <kata>` · `.bw list` · `.bw on|off`",
    );
  },
});