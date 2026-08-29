import logs from "./logger.js";

/**
 * Log error + reply pesan gagal standar ke chat.
 * @param {object} m - object message (memiliki `.reply` opsional).
 * @param {*} [error] - objek error untuk dicatat di log.
 * @param {string} [text] - pesan yang di-reply.
 */
export const replyError = async (m, error, text = "Terjadi kesalahan pada sistem.") => {
  if (error) logs.error(error);
  await m?.reply?.(text);
};