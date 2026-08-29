import logs from "#utils/logger.js";
import { getConfig } from "#utils/config.js";

const Handler = {
  list: new Map(),
};

/**
 * Matriks hak akses per role (PRD: owner/admin/groups/private/all).
 * @type {Record<string, (m: object) => boolean>}
 */
const accessChecks = {
  owner: (m) => m.isOwner === true,
  admin: (m) => m.isAdmin === true || m.isOwner === true,
  groups: (m) => m.isGroup === true,
  private: (m) => m.isGroup !== true,
  all: () => true,
};

const executeFn = async (command, opts) => {
  try {
    if (!command || !opts) return;

    const plugin = Handler.list.get(command);
    if (!plugin) return;

    const m = opts.m;
    if (!m?.sender) return;

    const access = plugin.options.access || "all";
    const check = accessChecks[access] || accessChecks.all;

    if (!check(m)) {
      const denyText = getConfig().messages?.[access];
      if (denyText) return m.reply?.(denyText);
      return;
    }

    logs.debug(`execute command '${command}' (access: ${access})`);
    await plugin.execute(opts);
  } catch (e) {
    console.error("Error executing command:", e);
  }
};

export { Handler, executeFn };