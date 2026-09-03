import { jidDecode, normalizeMessageContent } from "baileys";
import {
  decodeJid,
  extractBody,
  getCommand,
  isGroup,
  resolveSenderJid,
} from "./parse.js";
import { metadataGroup } from "./group.js";
import { jidToUserNumber } from "#utils/jid.js";
import { replyError } from "#utils/errors.js";
import { isOwner } from "#utils/config.js";
import { mediaMessageFor } from "#utils/media.js";

/**
 * Susun object `m` dari pesan masuk, lengkap dengan fungsi `m.reply`.
 *
 * @param {object} params
 * @param {import('baileys').proto.IWebMessageInfo} params.upsert
 * @param {ReturnType<typeof import('baileys').makeWASocket>} params.sock
 * @returns {Promise<object|null>} object `m` atau `null` bila sender tidak dapat di-resolve
 */
const buildMessage = async ({ upsert, sock }) => {
  const key = upsert.key;

  // Resolusi sender dengan fallback untuk pesan 'fromMe'
  let rawSender = resolveSenderJid(key);
  if (key.fromMe) {
    rawSender = sock.user?.id || sock.user?.jid || rawSender;
  }
  if (!rawSender) return null;

  // Bersihkan Device ID dari JID & ambil nomor/user ID murni
  const senderJid = decodeJid(rawSender);
  const senderUser = jidToUserNumber(senderJid);

  // Ambil body teks (conversation / caption / text)
  const { body, content, contentType } = extractBody(upsert.message);

  // Parse command
  const { text, command } = getCommand(body);

  // Resolusi status grup & admin
  const isGroupChat = isGroup(key?.remoteJid);
  let isAdmin = false;
  let metadata = null;

  if (isGroupChat) {
    metadata = await metadataGroup(sock, key.remoteJid);
    if (metadata?.participants) {
      const participant = metadata.participants.find((p) => {
        const pUser = jidDecode(decodeJid(p.id))?.user || p.phoneNumber;
        return pUser === senderUser;
      });
      // Optional chaining agar tidak melempar TypeError
      isAdmin = Boolean(participant?.admin || participant?.superadmin);
    }
  }

  const m = {
    key,
    chat: key.remoteJid,
    addressingMode: key?.addressingMode,
    sender: senderJid,
    senderLid: key.remoteJidAlt,
    fromMe: key?.fromMe,
    contentType,
    content,
    isOwner: isOwner(senderUser),
    body,
    metadata,
    isAdmin,
    isGroup: isGroupChat,
    text,
    command,
    mimeType: content?.mimeType || null,
    isButtonReply: [
      "buttonsResponseMessage",
      "listResponseMessage",
      "templateButtonReplyMessage",
      "interactiveResponseMessage",
    ].includes(contentType),
  };

  // Fungsi m.reply — quote pesan asli
  const contextInfo = content?.contextInfo;
  const quotedRaw = contextInfo?.quotedMessage || null;

  // Pesan yang di-reply (untuk plugin seperti repost/broadcast)
  if (quotedRaw) {
    m.quoted = {
      content: normalizeMessageContent(quotedRaw),
      key: {
        id: contextInfo?.stanzaId,
        remoteJid: m.chat,
        participant: contextInfo?.participant,
      },
      contextInfo,
    };
  } else {
    m.quoted = null;
  }

  m.reply = async (contentToReply, options = {}) => {
    try {
      if (contentToReply === undefined || contentToReply === null) return;

      let messageOptions = {};

      if (Buffer.isBuffer(contentToReply)) {
        messageOptions = mediaMessageFor(contentToReply, {
          mimetype: m.mimeType,
          fileName: options.fileName,
          caption: options.caption,
        });
        if (m.mimeType?.startsWith("audio/")) {
          messageOptions.ptt = options.ptt || false;
        }
      } else if (typeof contentToReply === "string") {
        messageOptions = { text: contentToReply };
      } else if (typeof contentToReply === "object") {
        messageOptions = { ...contentToReply };
      }

      if (options.quoted !== false) {
        messageOptions.quoted = upsert;
      }

      if (options.contextInfo) {
        messageOptions.contextInfo = {
          ...messageOptions.contextInfo,
          ...options.contextInfo,
        };
      }

      return await sock.sendMessage(m.chat, messageOptions, options);
    } catch (err) {
      console.error("[m.reply] Gagal mengeksekusi pengiriman pesan:", err);
    }
  };

  // Helper reply error standar
  m.replyError = (error, text) => replyError(m, error, text);

  return m;
};

export { buildMessage, buildMessage as serializeMessage };