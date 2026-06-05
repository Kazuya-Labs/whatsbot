import { delay, getContentType } from "@whiskeysockets/baileys";
import Handler from "../utils/registerHandler.js";
import { handlerProduk } from "../bussines-logic/index.js";
import NodeCache from "node-cache";

global.owner = [
  "6287875704129@s.whatsapp.net",
  "62882005824862@s.whatsapp.net",
];

const MSG_CACHE = new Map();
const CACHE_TTL = 5000;

const groupcache = new NodeCache({
  stdTTL: 600,
  checkperiod: 60,
  useClones: false,
});

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

const cacheGroup = async (sock, jid) => {
  let cache = groupcache.get(jid);
  if (cache) return cache;

  try {
    const metadata = await sock.groupMetadata(jid);
    if (metadata) {
      groupcache.set(jid, metadata);
      return metadata;
    }
  } catch (err) {
    console.error(`💥 [CACHE_GROUP_ERR] JID: ${jid}:`, err.message);
  }
  return null;
};

export default async function messageUpsert({ messages, type }, sock) {
  if (type !== "notify" || !messages?.length) return;

  const upsert = messages[0];
  const { key, message, pushName, messageTimestamp, broadcast } = upsert;
  if (
    key.remoteJid === "status@broadcast" ||
    key.chatJid === "status@broadcast"
  )
    return;

  if (MSG_CACHE.has(key.id)) return;
  MSG_CACHE.set(key.id, Date.now());

  try {
    const chatJid = key.remoteJid;
    const contentType = getContentType(message);
    const text = getText(message);

    let senderJid = null;
    if (key.addressingMode === "lid") {
      senderJid = key.remoteJidAlt || null;
    } else {
      senderJid = chatJid.endsWith("@g.us")
        ? key.participant
        : (key.remoteJid ?? null);
    }

    const m = {
      key,
      chatJid,
      chatLid: key.remoteJidAlt ?? chatJid,
      sender: key.participant ?? key.remoteJid,
      senderJid: senderJid,
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
          m.chatJid,
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

    m.react = async (emoji = "⏳") => {
      await sock.sendMessage(m.key.remoteJid, {
        react: {
          text: emoji,
          key: m.key,
        },
      });
    };

    const isOwner = global.owner.includes(m.senderJid);
    let isAdmin = false;

    if (m.isGroup) {
      const groupMetadata = await cacheGroup(sock, m.chatJid);
      if (groupMetadata) {
        const participants = groupMetadata.participants || [];
        const member = participants.find((p) => p.id === m.sender);

        if (member) {
          m.senderJid = member.id || m.senderJid;
          isAdmin = member.admin === "admin" || member.admin === "superadmin";
        }
      }
    }

    const timeLog = new Date(m.timestamp * 1000).toLocaleTimeString("id-ID");
    const logType = m.isGroup ? "GROUP" : "PRIVATE";
    const logSender = m.senderJid ? m.senderJid.split("@")[0] : "Unknown";
    const logContent = m.text
      ? m.text.replace(/\r?\n/g, " ")
      : `[${m.contentType}]`;

    console.log(
      `📡 [${timeLog}] [${logType}] | 👤 ${m.name} (${logSender}) ➔ ${logContent}`,
    );

    if (m.command) {
      await Handler.executeFn(m.command, {
        m,
        sock,
        isOwner,
        isGroup: m.isGroup,
        isAdmin,
      });
    }

    handlerProduk(m);
  } catch (err) {
    console.error("messageUpsert error:", err);
  }
}
