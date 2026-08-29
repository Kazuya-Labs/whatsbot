/**
 * Pisah teks menjadi array argumen: split + trim + buang entry kosong.
 * @param {string|null|undefined} text
 * @param {string} [sep=" "]
 * @returns {string[]}
 */
export const parseArgs = (text, sep = " ") =>
  String(text ?? "")
    .split(sep)
    .map((v) => v.trim())
    .filter(Boolean);

/**
 * Ambil argumen ke-i (0-based) dari text, dengan fallback bila kosong.
 * @param {string|null|undefined} text
 * @param {number} index
 * @param {string} [fallback=""]
 * @returns {string}
 */
export const argAt = (text, index, fallback = "") =>
  parseArgs(text)[index] ?? fallback;

/**
 * Konversi value menjadi Number aman; `fallback` dipakai bila bukan angka valid.
 * @param {*} value
 * @param {number} [fallback=0]
 * @returns {number}
 */
export const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};