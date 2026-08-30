import { decodeJid } from "#connection/parse.js";
import { phoneToJid } from "#utils/jid.js";
import { parseArgs } from "#utils/args.js";

/**
 * Resolusi JID target member dari pesan admin: prioritas reply (quoted),
 * lalu mention (@), terakhir nomor yang diketik di teks.
 *
 * @param {object} m - objek pesan
 * @returns {string[]} JID sender target (sudah di-decode)
 */
export const resolveTargetJids = (m) => {
  // 1. Reply pesan member
  if (m.quoted?.key?.participant) {
    return [decodeJid(m.quoted.key.participant)].filter(Boolean);
  }

  const targets = [];

  // 2. Mention dalam pesan
  const mentions = m.content?.contextInfo?.mentionedJid || [];
  for (const jid of mentions) {
    const decoded = decodeJid(jid);
    if (decoded) targets.push(decoded);
  }

  // 3. Nomor telepon yang diketik (628xx / 08xx)
  for (const token of parseArgs(m.text)) {
    const digits = token.match(/\d{6,15}/)?.[0];
    if (!digits) continue;
    const jid = phoneToJid(digits);
    if (jid) targets.push(jid);
  }

  return [...new Set(targets)];
};