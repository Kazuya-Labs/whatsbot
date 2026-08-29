import { mediaMessageFor } from "./media.js";

const MAX_POLL_OPTIONS = 12;
const MIN_POLL_OPTIONS = 2;
const MAX_OPTION_LENGTH = 200;

/**
 * Builder payload polling WhatsApp (murni, tanpa IO).
 *
 * @param {object} params
 * @param {string} params.question - teks pertanyaan (wajib).
 * @param {string[]} params.options - 2..12 pilihan, masing-masing ≤ 200 karakter.
 * @param {number} [params.selectableCount=2] - dinamis: `1` = pilih tunggal,
 *   `0` = multi tanpa batas, `2+` = multi maksimal N pilihan.
 *   Divalidasi Baileys: `0 <= selectableCount <= options.length`.
 * @returns {object} payload untuk sock.sendMessage (key `poll`).
 * @throws {Error} bila argument tidak valid.
 */
export const pollMessageFor = ({
  question,
  options,
  selectableCount = 2,
} = {}) => {
  if (!question || typeof question !== "string") {
    throw new Error("poll: parameter `question` wajib berupa string.");
  }
  if (
    !Array.isArray(options) ||
    options.length < MIN_POLL_OPTIONS ||
    options.length > MAX_POLL_OPTIONS
  ) {
    throw new Error(
      `poll: `+
      `pilihan harus berjumlah ${MIN_POLL_OPTIONS}..${MAX_POLL_OPTIONS}.`,
    );
  }

  const values = options.map(String);
  for (const value of values) {
    if (!value || value.length > MAX_OPTION_LENGTH) {
      throw new Error(
        `poll: setiap pilihan harus berisi 1..${MAX_OPTION_LENGTH} karakter.`,
      );
    }
  }

  if (!Number.isInteger(selectableCount) || selectableCount < 0) {
    throw new Error("poll: `selectableCount` harus integer ≥ 0.");
  }

  return {
    poll: {
      name: question,
      values,
      selectableCount,
    },
  };
};

/**
 * Kirim pesan polling ke sebuah chat.
 *
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts - sama seperti `pollMessageFor` + `quoted`.
 */
export const sendPoll = async (sock, jid, { quoted, ...params }) =>
  sock.sendMessage(jid, pollMessageFor(params), quoted ? { quoted } : undefined);

const renderLine = (cells, widths) =>
  `|${cells
    .map((cell, i) => ` ${String(cell ?? "").padEnd(widths[i])} `)
    .join("|")}|`;

/**
 * Format data menjadi tabel ASCII di dalam blok kode (monospace WhatsApp).
 * Murni sehingga mudah diuji.
 *
 * @param {object} params
 * @param {string[]} [params.headers] - nama kolom.
 * @param {Array<Array<string|number>>} [params.rows] - baris data (isian boleh bolong).
 * @returns {string}
 */
export const formatTable = ({ headers = [], rows = [] } = {}) => {
  const colCount = Math.max(
    1,
    headers.length,
    ...rows.map((row) => (Array.isArray(row) ? row.length : 0)),
  );

  const widths = [];
  for (let c = 0; c < colCount; c++) {
    const header = String(headers[c] ?? "");
    const cells = rows.map((row) => String(row[c] ?? ""));
    widths[c] = Math.max(header.length, ...cells.map((s) => s.length));
  }

  const separator = `|${widths.map((w) => "-".repeat(w + 2)).join("|")}|`;

  const lines = [];
  if (headers.length > 0) {
    lines.push(renderLine(headers, widths));
    lines.push(separator);
  }
  for (const row of rows) {
    const cells = Array.from({ length: colCount }, (_, c) => row?.[c] ?? "");
    lines.push(renderLine(cells, widths));
  }

  return `\`\`\`\n${lines.join("\n")}\n\`\`\``;
};

/**
 * Konversi subset Markdown ke format teks WhatsApp (\*bold\*, _italic_,
 * ~strike~, blok kode, heading, link, bullet list). Murni.
 * Catatan: blok kode (```) diproses lebih dulu agar isinya tidak ikut ter-konversi.
 *
 * @param {string} text
 * @returns {string}
 */
export const markdownToWhatsApp = (text) => {
  if (typeof text !== "string" || !text) return text;

  const blocks = [];
  let converted = text.replace(/```([\s\S]*?)```/g, (match, code) => {
    blocks.push(code);
    return `\u0000${blocks.length - 1}\u0000`;
  });

  // Bullet list markdown -> • 
  converted = converted.replace(/^[-+*]\s+(?=\S)/gm, "• ");

  // Link markdown -> "label (url)"
  converted = converted.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label, url) => `${label.trim()} (${url})`,
  );

  // Inline: bold / italic / strike (pola terpanjang menang di regex alternation)
  converted = converted.replace(
    /(\*\*[^*\n]+?\*\*)|(~~[^~\n]+?~~)|(\*[^*\n]+?\*)/g,
    (match, bold, strike, italic) => {
      if (bold) return `*${bold.slice(2, -2)}*`;
      if (strike) return `~${strike.slice(2, -2)}~`;
      if (italic) return `_${italic.slice(1, -1)}_`;
      return match;
    },
  );

  // Heading markdown -> tebal (setelah inline, agar output *tebal* tidak
  // di-italic-kan ulang oleh pass inline)
  converted = converted.replace(/^(#{1,6})\s*(.*)$/gm, (_m, _h, content) => {
    const title = content.trim();
    return title ? `*${title}*` : "";
  });

  // Pulihkan blok kode
  converted = converted.replace(/\u0000(\d+)\u0000/g, (_m, idx) => {
    return `\`\`\`\n${blocks[Number(idx)]}\n\`\`\``;
  });

  return converted;
};

/**
 * Kirim tabel (hasil `formatTable`), opsional dengan judul.
 *
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string[]} [opts.headers]
 * @param {Array<Array<string|number>>} [opts.rows]
 * @param {string} [opts.title] - judul di atas tabel.
 * @param {object} [opts.quoted]
 */
export const sendTable = async (
  sock,
  jid,
  { headers, rows, title, quoted } = {},
) => {
  let text = formatTable({ headers, rows });
  if (title) text = `${title}\n${text}`;
  return sock.sendMessage(jid, { text }, quoted ? { quoted } : undefined);
};

/**
 * Router kirim pesan terpadu.
 *
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {string|Buffer|object} content - string (opsional markdown), Buffer, atau payload object.
 * @param {object} [opts]
 * @param {boolean} [opts.markdown] - interpretasi string sebagai markdown.
 * @param {object} [opts.quoted]
 */
export const sendMessage = async (
  sock,
  jid,
  content,
  { markdown = false, quoted } = {},
) => {
  let payload;

  if (typeof content === "string") {
    payload = { text: markdown ? markdownToWhatsApp(content) : content };
  } else if (Buffer.isBuffer(content)) {
    payload = mediaMessageFor(content, {});
  } else if (content && typeof content === "object") {
    payload = content;
  } else {
    return undefined;
  }

  return sock.sendMessage(jid, payload, quoted ? { quoted } : undefined);
};