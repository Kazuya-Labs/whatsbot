import { getContentType, jidDecode, normalizeMessageContent } from "baileys";

/**
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

  const firstChar = text.charAt(0);
  const hasPrefix = prefixes.includes(firstChar);

  if (!hasPrefix) {
    return { command: null, text: null };
  }

  const [commandWithPrefix, ...newText] = text.split(" ");
  const command = commandWithPrefix.slice(1);

  return {
    command,
    text: newText.join(" "),
  };
};

/**
 * Helper untuk dekode / membersihkan Device JID (misal: 628xxx:12@s.whatsapp.net -> 628xxx@s.whatsapp.net)
 *
 * @param {string} jid
 */
const decodeJid = (jid) => {
  if (!jid) return jid;
  if (/:\d+@/gi.test(jid)) {
    const decode = jidDecode(jid) || {};
    return decode.user && decode.server ? `${decode.user}@${decode.server}` : jid;
  }
  return jid;
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
    documentMessage: () => content?.caption,
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
      // Tipe lain (reactionMessage, protocolMessage, dst) tidak punya teks
      return { contentType, content, body: "" };
  }
}

export { isGroup, getCommand, decodeJid, resolveSenderJid, extractBody };