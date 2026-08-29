import { jidDecode } from "baileys";
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

// Objek Set untuk efisiensi pengecekan O(1)
const ownerNumbers = new Set(["6285728153452", "62882005824862"]);

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
    isOwner: ownerNumbers.has(senderUser),
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

  // Fungsi m.reply
  m.reply = async (contentToReply, options = {}) => {
    try {
      if (contentToReply === undefined || contentToReply === null) return;

      let messageOptions = {};

      // A. INPUT ADALAH BUFFER
      if (Buffer.isBuffer(contentToReply)) {
        const mime = m.mimeType || "";

        if (mime.startsWith("image/")) {
          messageOptions = {
            image: contentToReply,
            caption: options.caption || "",
          };
        } else if (mime.startsWith("video/")) {
          messageOptions = {
            video: contentToReply,
            caption: options.caption || "",
          };
        } else if (mime.startsWith("audio/")) {
          messageOptions = {
            audio: contentToReply,
            mimetype: mime,
            ptt: options.ptt || false,
          };
        } else {
          messageOptions = {
            document: contentToReply,
            mimetype: mime || "application/octet-stream",
            fileName: options.fileName || "file",
          };
        }
      }
      // B. INPUT ADALAH STRING
      else if (typeof contentToReply === "string") {
        messageOptions = { text: contentToReply };
      }
      // C. INPUT ADALAH OBJEK
      else if (typeof contentToReply === "object") {
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