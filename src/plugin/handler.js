import logs from "#utils/logger.js";

const Handler = {
  list: new Map(),
};

const message = {
  onlyOwner: "❌ Perintah ini hanya dapat digunakan oleh Owner Bot!",
  onlyGrup: "❌ Perintah ini hanya dapat digunakan di dalam Grup!",
  onlyAdmin: "❌ Perintah ini hanya dapat digunakan oleh Admin Grup!",
  onlyPrivate: "❌ Perintah ini hanya dapat digunakan di dalam chat Private!",
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

const accessMessages = {
  owner: message.onlyOwner,
  admin: message.onlyAdmin,
  groups: message.onlyGrup,
  private: message.onlyPrivate,
  all: null,
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
      return m.reply?.(accessMessages[access]);
    }

    logs.debug(`execute command '${command}' (access: ${access})`);
    await plugin.execute(opts);
  } catch (e) {
    console.error("Error executing command:", e);
  }
};

export { Handler, executeFn };