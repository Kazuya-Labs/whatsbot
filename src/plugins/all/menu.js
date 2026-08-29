import { parseArgs } from "#utils/args.js";
import { getConfig, getPrefixes } from "#utils/config.js";
import { Handler } from "#plugin/handler.js";
import { createPlugin } from "#utils/plugin.js";

const ACCESS_ORDER = ["owner", "admin", "groups", "private", "all"];

const ACCESS_LABELS = {
  owner: "👑 *Owner*",
  admin: "🛡️ *Admin*",
  groups: "👥 *Grup*",
  private: "🔒 *Private*",
  all: "🌐 *Semua*",
};

const ACCESS_BADGES = {
  owner: "👑",
  admin: "🛡️",
  groups: "👥",
  private: "🔒",
  all: "🌐",
};

const ACCESS_HINTS = ACCESS_ORDER.join("|");

/**
 * Susun teks menu dari kandidat command.
 *
 * @param {object} params
 * @param {object} params.commands - Map command -> { options: { access, description } }
 * @param {string[]} params.prefixes
 * @param {string} [params.botName]
 * @param {string} [params.footer]
 * @param {"owner"|"admin"|"groups"|"private"|"all"} [params.filter] - tampilkan hanya access ini.
 * @returns {string}
 */
export const buildMenuText = ({ commands, prefixes, botName, footer, filter }) => {
  const items = [];
  for (const [name, cmd] of commands) {
    const access = cmd.options?.access || "all";
    const description = cmd.options?.description ?? "";
    items.push({ name, access, description });
  }

  items.sort(
    (a, b) =>
      ACCESS_ORDER.indexOf(a.access) - ACCESS_ORDER.indexOf(b.access) ||
      a.name.localeCompare(b.name),
  );

  const prefix = prefixes[0] || "!";

  let menu = "";
  if (filter) {
    const label = ACCESS_LABELS[filter];
    menu += `${label}\n`;
    const filtered = items.filter((it) => it.access === filter);
    if (filtered.length === 0) menu += "_(Belum ada perintah di sini.)_\n";
    for (const it of filtered) {
      menu += `• ${prefix}${it.name}${it.description ? ` — ${it.description}` : ""}\n`;
    }
  } else {
    menu += `📋 *MENU ${botName || "Bot"}*\n\n`;
    let current = "";
    for (const it of items) {
      if (it.access !== current) {
        current = it.access;
        menu += `${ACCESS_LABELS[current]}\n`;
      }
      menu += `• ${accessBadge(it.access)} ${prefix}${it.name}${it.description ? ` — ${it.description}` : ""}\n`;
    }
    menu += `\nGunakan *${prefix}menu <access>* untuk filter.\n`;
  }

  if (footer) menu += `\n${footer}`;
  return menu;
};

const accessBadge = (access) => ACCESS_BADGES[access] || "•";

export default createPlugin({
  names: ["menu", "help"],
  description: "Menampilkan semua perintah / menu bot",
  run: async ({ m }) => {
    const prefixMenu = `${getPrefixes()[0] || "!"}menu`;
    const filterArg = parseArgs(m.text)[0]?.toLowerCase();
    const valid = ACCESS_ORDER.includes(filterArg);

    if (filterArg && !valid) {
      return m.reply(
        `Filter menu tidak valid: *${filterArg}*.\nGunakan salah satu: *${ACCESS_HINTS}* (contoh: *${prefixMenu} owner*).`,
      );
    }

    const config = getConfig();
    const text = buildMenuText({
      commands: Handler.list,
      prefixes: getPrefixes(),
      botName: config.bot?.name,
      footer: config.bot?.footer,
      filter: valid ? filterArg : undefined,
    });

    return m.reply(text);
  },
});