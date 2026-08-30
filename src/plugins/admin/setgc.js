import { createPlugin } from "#utils/plugin.js";
import { parseArgs } from "#utils/args.js";

const SUBCOMMANDS = {
  announce: {
    on: "announcement",
    off: "not_announcement",
    label: "pengumuman (khusus admin)",
  },
  lock: {
    on: "locked",
    off: "unlocked",
    label: "mode terkunci",
  },
  open: { on: "all_member_add", off: "all_member_add", label: "tambah anggota (semua)", fixed: true },
  close: { on: "admin_add", off: "admin_add", label: "tambah anggota (admin)", fixed: true },
  approval: { on: "on", off: "off", label: "persetujuan masuk", mode: "approval" },
};

const apply = async (sock, jid, sub, state, m) => {
  const cfg = SUBCOMMANDS[sub];
  if (cfg.mode === "approval") {
    await sock.groupJoinApprovalMode(jid, state);
  } else if (cfg.fixed) {
    await sock.groupMemberAddMode(jid, cfg.on);
  } else {
    await sock.groupSettingUpdate(jid, cfg[state]);
  }
  return m.reply(`✅ ${cfg.label}: ${state}`);
};

export default createPlugin({
  names: ["setgc", "set"],
  description: "Atur grup: announce/lock/open-close/approval (.set announce on)",
  run: async ({ m, sock }) => {
    const [sub, state] = parseArgs(m.text);

    if (!SUBCOMMANDS[sub]) {
      return m.reply(
        "Format: `.set <perintah> <on|off>`\n" +
          "• `announce on|off` — chat khusus admin\n" +
          "• `lock on|off` — kunci info grup\n" +
          "• `open` — semua bisa tambah member / `close` — admin saja\n" +
          "• `approval on|off` — persetujuan anggota baru",
      );
    }

    if (sub === "open" || sub === "close") {
      return apply(sock, m.chat, sub, state, m);
    }

    if (!["on", "off"].includes(state)) {
      return m.reply(`Format: \`.set ${sub} on|off\``);
    }

    try {
      return await apply(sock, m.chat, sub, state, m);
    } catch (error) {
      return m.reply(`Gagal set grup: ${error.message}`);
    }
  },
});