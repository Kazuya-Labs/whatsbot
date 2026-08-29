import { Handler } from "./handler.js";

const VALID_ACCESS = ["owner", "admin", "groups", "private", "all"];

/**
 * Normalisasi hak akses plugin.
 * Prioritas: field `access` eksplisit, lalu fallback ke key legacy
 * (isOwner/owner, isAdmin, isGroup).
 *
 * @param {object} opts
 * @returns {"owner"|"admin"|"groups"|"private"|"all"}
 */
const resolveAccess = (opts = {}) => {
  if (opts.access) return opts.access;
  if (opts.owner || opts.isOwner) return "owner";
  if (opts.isAdmin) return "admin";
  if (opts.isGroup) return "groups";
  return "all";
};

const loadPlugins = (names, execute, opts = {}) => {
  try {
    const access = resolveAccess(opts);
    if (!VALID_ACCESS.includes(access)) {
      console.error("Access tidak valid:", access, "untuk", names);
      return;
    }

    const options = {
      tag: opts.tag || "user",
      access,
      file: opts.file,
    };

    const pluginData = { execute, options };

    if (Array.isArray(names)) {
      const len = names.length;
      for (let i = 0; i < len; i++) {
        Handler.list.set(names[i], pluginData);
      }
    } else if (names) {
      Handler.list.set(names, pluginData);
    }
  } catch (e) {
    console.error("Error loading plugin:", e);
  }
};

export { loadPlugins };