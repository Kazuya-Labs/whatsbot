import { getContentType, jidDecode, normalizeMessageContent } from "baileys";
import { getPrefixes } from "#utils/config.js";
import { isGroupJid } from "#utils/jid.js";

/**
 * @param {import('baileys').JidServer} jid
 * @returns {boolean}
 */
const isGroup = (jid) => isGroupJid(jid);

/**
 * @param {string} text
 */
const getCommand = (text = null) => {
  if (typeof text !== "string") {
    return { command: null, text: null };
  }

  const prefixes = getPrefixes();

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
 * Memastikan sender berformat @s.whatsapp.net (bukan @lid). Cek remoteJid &
 * participant (alt) karena Baileys bisa memakai LID tergantung addressingMode.
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

  return null; // semua kandidat @lid atau kosong
}

/**
 * Ambil teks utama dari content sesuai contentType-nya.
 *
 * @param {any} content - wrapper message (mis. content dari extractBody)
 * @param {string|null} contentType
 * @returns {string}
 */
export const extractTextFromContent = (content, contentType) => {
  const textSources = {
    conversation: () => (typeof content === "string" ? content : content?.conversation),
    extendedTextMessage: () => content?.text,
    imageMessage: () => content?.caption,
    videoMessage: () => content?.caption,
    documentMessage: () => content?.caption,
  };
  return textSources[contentType]?.() || "";
};

/**
 * Ambil "body" text dari berbagai tipe pesan — biasa, berbungkus
 * (ephemeral/view-once), dan balasan button/list.
 *
 * @param {any} rawMessage - object `message` mentah dari upsert (message?.message)
 * @returns {{ contentType: string|null, content: any, body: string }}
 */
function extractBody(rawMessage) {
  // buka bungkus ephemeral/view-once
  const message = normalizeMessageContent(rawMessage);
  if (!message) {
    return { contentType: null, content: null, body: "" };
  }

  const contentType = getContentType(message) || null;
  const content = contentType ? message[contentType] : null;

  // teks & caption media
  if (
    ["conversation", "extendedTextMessage", "imageMessage", "videoMessage", "documentMessage"].includes(contentType)
  ) {
    return { contentType, content, body: extractTextFromContent(content, contentType) };
  }

  // balasan button/list
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
      // reaction/protocol/tipe lain tidak punya teks
      return { contentType, content, body: "" };
  }
}

export { isGroup, getCommand, decodeJid, resolveSenderJid, extractBody };