/**
 * Ekstrak tautan dari teks.
 *
 * @param {string} text
 * @param {"invite"|"all"} [mode="invite"] - "invite": hanya tautan undangan grup
 *   (chat.whatsapp.com/wa.me); "all": semua URL http(s).
 * @returns {string[]} tautan unik yang ditemukan
 */
export const extractLinks = (text = "", mode = "invite") => {
  const source = String(text);
  if (!source) return [];

  if (mode === "all") {
    const urls = source.match(/https?:\/\/[^\s<>"']+/gi) || [];
    return [...new Set(urls)];
  }

  const invites = source.match(/(?:https?:\/\/)?(?:chat\.whatsapp\.com\/[A-Za-z0-9_-]+|wa\.me\/[0-9]+)/gi) || [];
  return [...new Set(invites)];
};

/** Escape karakter regex khusus. @param {string} s */
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cek apakah teks mengandung salah satu kata terlarang
 * (case-insensitive, cocok pada batas kata).
 *
 * @param {string} text
 * @param {string[]} words
 * @returns {boolean}
 */
export const hasBadWord = (text = "", words = []) => {
  const source = String(text);
  if (!source || !Array.isArray(words) || words.length === 0) return false;

  const pattern = words
    .filter((w) => typeof w === "string" && w.trim())
    .map((w) => `(?<![A-Za-z0-9_])${escapeRegExp(w.trim())}(?![A-Za-z0-9_])`)
    .join("|");

  if (!pattern) return false;
  return new RegExp(pattern, "i").test(source);
};