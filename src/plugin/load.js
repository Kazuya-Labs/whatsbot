import { Handler } from "./handler.js";

const VALID_ACCESS = ["owner", "admin", "groups", "private", "all"];

/**
 * Infer access dari folder file plugin (`/src/plugins/<access>/...`).
 * @param {string|undefined} file
 * @returns {"owner"|"admin"|"groups"|"private"|"all"|undefined}
 */
const accessFromFile = (file) => {
  if (!file) return undefined;
  const match = file.match(/[\\/]src[\\/]plugins[\\/]([^\\/]+)[\\/]/);
  return match && VALID_ACCESS.includes(match[1]) ? match[1] : undefined;
};

/**
 * Normalisasi hak akses plugin.
 * Prioritas: field `access` eksplisit, lalu fallback ke key legacy
 * (isOwner/owner, isAdmin, isGroup), terakhir infer dari folder file.
 *
 * @param {object} opts
 * @returns {"owner"|"admin"|"groups"|"private"|"all"}
 */
const resolveAccess = (opts = {}) => {
  if (opts.access) return opts.access;
  if (opts.owner || opts.isOwner) return "owner";
  if (opts.isAdmin) return "admin";
  if (opts.isGroup) return "groups";
  return accessFromFile(opts.file) ?? "all";
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
      description: opts.description,
    };

    const pluginData = { execute, options };

    if (typeof opts.onMessage === "function") {
      Handler.hooks.push(opts.onMessage);
    }

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