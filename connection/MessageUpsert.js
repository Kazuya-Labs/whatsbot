import { delay, getContentType } from "@whiskeysockets/baileys";
import Handler from "../utils/registerHandler.js";

global.owner = ["628123456789@s.whatsapp.net", "628987654321@s.whatsapp.net"];

const MSG_CACHE = new Map();
const CACHE_TTL = 5000;

const cleanCache = () => {
  const now = Date.now();
  for (const [id, ts] of MSG_CACHE) {
    if (now - ts > CACHE_TTL) MSG_CACHE.delete(id);
  }
};
setInterval(cleanCache, CACHE_TTL).unref();

const getText = (msg) =>
  msg?.conversation ??
  msg?.caption ??
  msg?.extendedTextMessage?.text ??
  msg?.imageMessage?.caption ??
  msg?.videoMessage?.caption ??
  null;

export default async function messageUpsert({ messages, type }, sock) {
  if (type !== "notify" || !messages?.length) return;

  const upsert = messages[0];
  const { key, message, pushName, messageTimestamp, broadcast } = upsert;

  // Cegah double process
  if (MSG_CACHE.has(key.id)) return;
  MSG_CACHE.set(key.id, Date.now());

  try {
    const chatJid = key.remoteJid;
    const contentType = getContentType(message);
    const text = getText(message);

    // Object m dibikin flat, hindari JSON.stringify buat log kecuali debug
    const m = {
      key,
      chatJid,
      chatLid: key.remoteJidAlt ?? chatJid,
      sender: key.participant ?? key.remoteJid,
      senderLid: key.participantAlt ?? null,
      name: pushName ?? "",
      broadcast: broadcast ?? false,
      isGroup: chatJid.endsWith("@g.us"),
      text,
      command: text?.split(/\s+/)[0] ?? null,
      contentType,
      mimetype: message?.[contentType]?.mimetype ?? null,
      timestamp: messageTimestamp,
      addressingMode: key.addressingMode,
      quoted: message?.[contentType]?.contextInfo?.quotedMessage ?? null,
    };

    m.reply = async (text, { withDelay = true, ms = 1200 } = {}) => {
      try {
        if (!text) return;

        const mentionMatches = text.match(/@(\d{9,15})/g);
        let mentions = [];

        if (mentionMatches) {
          mentions = [
            ...new Set(
              mentionMatches.map(
                (num) => `${num.replace("@", "")}@s.whatsapp.net`,
              ),
            ),
          ];
        }

        if (withDelay) {
          await sock.sendPresenceUpdate("composing", chatJid);
          const dynamicDelay = Math.max(ms, Math.min(text.length * 20, 3000));
          await delay(dynamicDelay);
        }

        return sock.sendMessage(
          m.chatLid,
          {
            text,
            mentions: mentions.length > 0 ? mentions : undefined,
          },
          { quoted: upsert },
        );
      } catch (err) {
        console.error(
          "💥 [ERROR_REPLY]: Gagal mengeksekusi fungsi reply:",
          err.message,
        );
      }
    };
    // Log ringan, hindari JSON.stringify full object biar hemat CPU
    if (process.env.DEBUG) {
      console.log(`[${m.contentType}] ${m.name}: ${m.text}`);
    }

    const isOwner = global.owner.includes(m.sender);

    let isAdmin = false;
    if (m.isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(m.chatJid);
        const participants = groupMetadata.participants || [];
        // Cari pengirim di dalam daftar partisipan grup yang memiliki status admin/superadmin
        const member = participants.find((p) => p.id === m.sender);
        isAdmin = member?.admin === "admin" || member?.admin === "superadmin";
      } catch (e) {
        console.error("Gagal mengambil metadata grup:", e.message);
      }
    }

    if (m.command) {
      await Handler.executeFn(m.command, {
        m,
        sock,
        isOwner,
        isGroup: m.isGroup,
        isAdmin,
      });
    }
  } catch (err) {
    console.error("messageUpsert error:", err);
  }
}
