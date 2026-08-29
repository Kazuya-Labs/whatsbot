import { replyError } from "./errors.js";

/**
 * Factory plugin: membungkus `run` dengan try/catch + logging + error reply
 * serta menyeragamkan bentuk default export.
 *
 * @param {object} cfg
 * @param {string|string[]} cfg.names - command word tanpa prefix.
 * @param {(opts: {m: object, sock: import('baileys').WASocket}) => Promise<*>} cfg.run
 * @param {"owner"|"admin"|"groups"|"private"|"all"} [cfg.access] - opsional; fallback infer dari folder.
 * @param {string} [cfg.description]
 * @returns {{execute: Function, names: string|string[], access?: string, description?: string}}
 */
export const createPlugin = ({ names, run, access, description }) => {
  const execute = async (opts) => {
    const { m } = opts;
    try {
      return await run(opts);
    } catch (error) {
      const label = Array.isArray(names) ? names.join("/") : names;
      await replyError(m, error, `Terjadi kesalahan pada plugin *${label}*.`);
      return false;
    }
  };

  return {
    execute,
    names,
    ...(access ? { access } : {}),
    ...(description ? { description } : {}),
  };
};