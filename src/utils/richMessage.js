import { proto, generateWAMessageFromContent } from "baileys";

/**
 * Rich Message (Meta AI-style) — builder + sender.
 *
 * Catatan: ini BUKAN HTML (WhatsApp tak punya tipe pesan HTML). Ini pesan
 * terstruktur (teks/tabel/kode/LaTeX) via proto `AIRichResponse*` yang
 * dirender sebagai komponen native. Paket resmi baileys tidak punya method
 * socket untuk ini — proto sudah dikompilasi di `node_modules/baileys/WAProto`,
 * jadi ditulis langsung di sini. ⚠️ Eksperimental: normalnya hanya dikirim
 * akun bot Meta AI, bisa ditolak/gagal dirender di klien lama.
 *
 * Struktur: Message.richResponseMessage(97) -> AIRichResponseMessage
 *   .messageType=STANDARD(1), .submessages[] -> AIRichResponseSubMessage
 *   (.messageType TEXT(2)/TABLE(4)/CODE(5)/LATEX(8), + metadata terkait)
 */

/** @param {string} text @returns {import('baileys').proto.AIRichResponseSubMessage} */
export const textSubMessageFor = (text) =>
  proto.AIRichResponseSubMessage.create({
    messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TEXT,
    messageText: text,
  });

/**
 * @param {object} params
 * @param {string} [params.title]
 * @param {string[]} [params.headers] - jadi baris heading.
 * @param {Array<Array<string|number>>} [params.rows]
 * @returns {import('baileys').proto.AIRichResponseSubMessage}
 */
export const tableSubMessageFor = ({ title, headers = [], rows = [] } = {}) => {
  const tableRows = [];
  if (headers.length > 0) {
    tableRows.push(
      proto.AIRichResponseTableMetadata.AIRichResponseTableRow.create({
        items: headers.map(String),
        isHeading: true,
      }),
    );
  }
  for (const row of rows) {
    if (Array.isArray(row)) {
      tableRows.push(
        proto.AIRichResponseTableMetadata.AIRichResponseTableRow.create({
          items: row.map(String),
        }),
      );
    }
  }
  const tableMetadata =
    proto.AIRichResponseTableMetadata.create({ rows: tableRows });
  if (title) tableMetadata.title = title;
  return proto.AIRichResponseSubMessage.create({
    messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_TABLE,
    tableMetadata,
  });
};

/**
 * Tokenizer kode -> blok ber-highlight (keyword/string/number).
 * @param {string} code
 * @param {object} [params]
 * @param {string} [params.language]
 * @returns {import('baileys').proto.AIRichResponseSubMessage}
 */
export const codeSubMessageFor = (code, { language = "text" } = {}) => {
  const HL = proto.AIRichResponseCodeMetadata.AIRichResponseCodeHighlightType;
  const KEYWORDS = new Set(
    language.toLowerCase() === "javascript" || language.toLowerCase() === "js"
      ? ["const", "let", "var", "function", "return", "if", "else", "for", "while", "new", "await", "async", "import", "export", "from", "class"]
      : language.toLowerCase() === "python"
        ? ["def", "return", "if", "elif", "else", "for", "while", "import", "from", "class", "lambda", "with", "as", "print", "None", "True", "False"]
        : [],
  );

  const codeBlocks = [];
  const tokens = code.split(/(\s+)/);
  for (const token of tokens) {
    if (!token) continue;
    let highlightType = HL.AI_RICH_RESPONSE_CODE_HIGHLIGHT_DEFAULT;
    if (/^["'`].*["'`]$/.test(token)) {
      highlightType = HL.AI_RICH_RESPONSE_CODE_HIGHLIGHT_STRING;
    } else if (KEYWORDS.has(token)) {
      highlightType = HL.AI_RICH_RESPONSE_CODE_HIGHLIGHT_KEYWORD;
    } else if (/^\d+(\.\d+)?$/.test(token)) {
      highlightType = HL.AI_RICH_RESPONSE_CODE_HIGHLIGHT_NUMBER;
    }
    codeBlocks.push(
      proto.AIRichResponseCodeMetadata.AIRichResponseCodeBlock.create({
        highlightType,
        codeContent: token,
      }),
    );
  }

  const codeMetadata = proto.AIRichResponseCodeMetadata.create({
    codeLanguage: language,
    codeBlocks,
  });
  return proto.AIRichResponseSubMessage.create({
    messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_CODE,
    codeMetadata,
  });
};

/** @param {string} latex @returns {import('baileys').proto.AIRichResponseSubMessage} */
export const latexSubMessageFor = (latex) => {
  const latexMetadata = proto.AIRichResponseLatexMetadata.create({
    expressions: [latex],
  });
  return proto.AIRichResponseSubMessage.create({
    messageType: proto.AIRichResponseSubMessageType.AI_RICH_RESPONSE_LATEX,
    latexMetadata,
  });
};

/** @param {Array<import('baileys').proto.AIRichResponseSubMessage>} submessages @returns {import('baileys').proto.AIRichResponseMessage} */
export const richResponseMessageFor = (submessages) =>
  proto.AIRichResponseMessage.create({
    messageType: proto.AIRichResponseMessageType.AI_RICH_RESPONSE_TYPE_STANDARD,
    submessages,
  });

/**
 * Bangun pesan WA mentah (belum dikirim); pola sama dgn carousel.
 * @param {string} jid
 * @param {import('baileys').proto.AIRichResponseMessage} richMessage
 * @param {object} [options]
 * @param {string} [options.userJid]
 * @param {import('baileys').proto.IWebMessageInfo} [options.quoted] - WAMessage mentah (bukan `m.quoted` ter-normalisasi).
 * @returns {import('baileys').proto.IWebMessageInfo}
 */
export const buildRichWAMessage = (jid, richMessage, { userJid, quoted } = {}) =>
  generateWAMessageFromContent(
    jid,
    {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      richResponseMessage: richMessage,
      ...(quoted?.key?.id
        ? {
            contextInfo: {
              quotedMessage:
                quoted.message || proto.Message.create({ conversation: "" }),
              participant: quoted.participant,
              stanzaId: quoted.key.id,
              remoteJid: quoted.key.remoteJid,
            },
          }
        : {}),
    },
    { userJid },
  );

/**
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} content
 * @param {object} [content.richMessage] - hasil `richResponseMessageFor`.
 * @param {Array<import('baileys').proto.AIRichResponseSubMessage>} [content.submessages] - langsung bila tanpa richMessage.
 * @param {string} [content.userJid]
 * @param {object} [content.quoted]
 * @returns {Promise<import('baileys').proto.IWebMessageInfo>}
 */
export const sendRichMessage = async (sock, jid, content = {}) => {
  const { richMessage, submessages, userJid, quoted } = content;
  const rich =
    richMessage || (submessages ? richResponseMessageFor(submessages) : null);
  if (!rich) {
    throw new Error("sendRichMessage: butuh `richMessage` atau `submessages`.");
  }
  const msg = buildRichWAMessage(jid, rich, {
    userJid: userJid || sock.user?.id,
    quoted,
  });
  await sock.relayMessage(jid, msg.message, { messageId: msg.key.id });
  return msg;
};

/**
 * Kirim tabel rich.
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string[]} [opts.headers]
 * @param {Array<Array<string|number>>} [opts.rows]
 * @param {object} [opts.quoted]
 */
export const sendRichTable = async (sock, jid, opts = {}) => {
  const { title, headers, rows, quoted } = opts;
  const submessages = [];
  if (title) submessages.push(textSubMessageFor(title));
  submessages.push(tableSubMessageFor({ headers, rows }));
  return sendRichMessage(sock, jid, { submessages, quoted });
};

/**
 * Kirim blok kode rich.
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {string} code
 * @param {object} [opts]
 * @param {string} [opts.language]
 * @param {object} [opts.quoted]
 */
export const sendRichCode = async (sock, jid, code, opts = {}) => {
  const { language, quoted } = opts;
  const submessages = [];
  if (language) submessages.push(textSubMessageFor(language));
  submessages.push(codeSubMessageFor(code, { language }));
  return sendRichMessage(sock, jid, { submessages, quoted });
};

/**
 * Kirim teks rich.
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {string} text
 * @param {object} [opts]
 * @param {object} [opts.quoted]
 */
export const sendRichText = async (sock, jid, text, opts = {}) =>
  sendRichMessage(sock, jid, {
    submessages: [textSubMessageFor(text)],
    quoted: opts.quoted,
  });
