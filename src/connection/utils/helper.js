import { getContentType, normalizeMessageContent } from "baileys";
import NodeCache from "node-cache";
import util from "util";


const cacheJid = new NodeCache({
  stdTTL:60,
  maxKeys:1000,
  useClones:false,
})
/**
 *
 * @param {import('baileys').JidServer} jid
 * @returns {boolean}
 */
const isGroup = (jid) => jid.endsWith("@g.us");

/**
 * @param {string} text
 */
const getCommand = (text = null) => {
  if (typeof text !== "string") {
    return { command: null, text: null };
  }

  const prefixes = ["!", "."];

  // 1. CARA BENAR: Ambil karakter pertama, lalu cek apakah ada di DALAM array
  const firstChar = text.charAt(0);
  const hasPrefix = prefixes.includes(firstChar);

  // Jika tidak memiliki prefix, kembalikan objek kosong agar tidak undefined
  if (!hasPrefix) {
    return { command: null, text: null };
  }

  // 2. Ambil command dan sisa teks
  const [commandWithPrefix, ...newText] = text.split(" ");

  // Hilangkan karakter prefix dari command jika ingin nama command-nya saja (misal: "ping" bukan "!ping")
  const command = commandWithPrefix.slice(1);

  return {
    command: command,
    text: newText.join(" "), // 3. Gunakan " " agar teks kembali dipisah spasi, bukan koma
  };
};

/**
 * Memastikan sender selalu dalam format @s.whatsapp.net (bukan @lid).
 * Baileys bisa mengirim remoteJid/remoteJidAlt dalam mode LID tergantung
 * addressingMode, jadi kita cek dua-duanya dan ambil yang berakhiran .net.
 *
 * @param {import('baileys').proto.IMessageKey} key
 * @returns {string|null}
 */
function resolveSenderJid(key) {
  const candidates = [
    key?.remoteJidAlt,
    key?.remoteJid,
    key?.participantAlt,
    key?.participant,
  ];

  for (const jid of candidates) {
    if (typeof jid === "string" && jid.endsWith("@s.whatsapp.net")) {
      return jid;
    }
  }

  return null; // tidak ada kandidat yang valid (semua @lid atau kosong)
}

/**
 * Ambil "body" text dari berbagai tipe pesan WhatsApp — termasuk pesan biasa,
 * pesan berbungkus (ephemeral/view-once), dan balasan button/list.
 *
 * @param {any} rawMessage - object `message` mentah dari upsert (message?.message)
 * @returns {{ contentType: string|null, content: any, body: string }}
 */
function extractBody(rawMessage) {
  // --- 1. Buka bungkus ephemeral/view-once dulu ---
  // Tanpa ini, pesan di chat yang punya disappearing message aktif
  // akan selalu gagal terbaca (contentType-nya "ephemeralMessage", bukan tipe aslinya).
  const message = normalizeMessageContent(rawMessage);
  if (!message) {
    return { contentType: null, content: null, body: "" };
  }

  const contentType = getContentType(message) || null;
  const content = contentType ? message[contentType] : null;

  // --- 2. Pesan teks & caption media ---
  const textSources = {
    conversation: () => message.conversation,
    extendedTextMessage: () => content?.text,
    imageMessage: () => content?.caption,
    videoMessage: () => content?.caption,
    documentMessage: () => content?.caption, // sebelumnya kelewat
  };

  if (textSources[contentType]) {
    return { contentType, content, body: textSources[contentType]() || "" };
  }

  // --- 3. Balasan button/list ---
  switch (contentType) {
    case "buttonsResponseMessage":
      return {
        contentType,
        content,
        body: content?.selectedDisplayText || content?.selectedButtonId || "",
      };

    case "listResponseMessage":
      return {
        contentType,
        content,
        body: content?.title || content?.singleSelectReply?.selectedRowId || "",
      };

    case "templateButtonReplyMessage":
      return {
        contentType,
        content,
        body: content?.selectedDisplayText || content?.selectedId || "",
      };

    case "interactiveResponseMessage": {
      try {
        const params = JSON.parse(
          content?.nativeFlowResponseMessage?.paramsJson || "{}",
        );
        return {
          contentType,
          content,
          body: params?.id || params?.selectedRowId || "",
        };
      } catch {
        return { contentType, content, body: "" };
      }
    }

    default:
      // tipe lain (reactionMessage, protocolMessage, stickerMessage, dst)
      // memang nggak punya teks — return kosong itu wajar, bukan bug
      return { contentType, content, body: "" };
  }
}

/**
 *
 * @param {string} text - bahan eval
 * @param {Object} m
 */
const evalForDev = async (text, m) => {
  try {
    let evaluated = eval(textToEval);

    // Jika hasil eval berupa objek, gunakan util.inspect agar strukturnya terlihat jelas
    if (typeof evaluated !== "string") {
      evaluated = util.inspect(evaluated, { depth: 2 }); // depth bisa ditambah sesuai kebutuhan
    }

    await m.reply(evaluated);
  } catch (error) {
    await reply(String(err));
  }
};

export { isGroup, getCommand, resolveSenderJid, extractBody, evalForDev };
