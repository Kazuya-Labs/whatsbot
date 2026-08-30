import { jidDecode } from "baileys";
import { sanitizePhoneNumber } from "./general.js";

/**
 * Cek apakah sebuah JID merupakan JID grup WhatsApp.
 * @param {string|null|undefined} jid
 * @returns {boolean}
 */
export const isGroupJid = (jid) => Boolean(jid && jid.endsWith("@g.us"));

/**
 * Ambil nomor pengguna murni dari JID
 * (628xxx:12@s.whatsapp.net / @lid -> 628xxx).
 *
 * @param {string|null|undefined} jid
 * @returns {string|null}
 */
export const jidToUserNumber = (jid) => {
  if (!jid) return null;
  const decoded = jidDecode(jid);
  return decoded?.user || String(jid).split("@")[0] || null;
};

/**
 * Ubah nomor telepon (08xx / 628xx / +62) menjadi JID @s.whatsapp.net.
 * @param {string|number|null|undefined} number
 * @returns {string|null}
 */
export const phoneToJid = (number) => {
  const clean = sanitizePhoneNumber(String(number ?? ""));
  return clean ? `${clean}@s.whatsapp.net` : null;
};