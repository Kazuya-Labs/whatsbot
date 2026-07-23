import { getContentType, jidDecode, proto, S_WHATSAPP_NET } from "baileys";
import util from "util";
import {
  extractBody,
  getCommand,
  isGroup,
  resolveSenderJid,
} from "./utils/helper.js";
import { formatDateId } from "../utils/timeHelper.js";
import logs from "../utils/logs.js";
import { executeFn } from "../pluginHandler/index.js";
import { metadataGroup } from "./utils/groupHelper.js";

// Menggunakan objek bertipe Set untuk efisiensi pengecekan O(1)
const ownerNumber = new Set(["6285728153452", "62882005824862"]);

const locked = new Set();

/**
 * Helper untuk dekode / membersihkan Device JID (misal: 628xxx:12@s.whatsapp.net -> 628xxx@s.whatsapp.net)
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
 * @param {import('baileys').BaileysEventMap['messages.upsert']} ev
 * @param {ReturnType<typeof makeWASocket>} sock
 */
const messageUpsert = async (ev, sock) => {
  // --- 1. Guard awal: hanya proses event notify ---
  if (ev.type !== "notify") return;

  const upsert = ev.messages[0];
  if (!upsert) return;

  const key = upsert.key;
  const keyId = key?.id;
  if (key.remoteJid === "status@broadcast") return;
  if (!keyId || locked.has(keyId)) return;

  locked.add(keyId);

  try {
    const rawMessage = upsert.message;

    // --- 2. Resolusi sender dengan fallback untuk pesan 'fromMe' ---
    let rawSender = resolveSenderJid(key);
    if (key.fromMe) {
      rawSender = sock.user?.id || sock.user?.jid || rawSender;
    }
    if (!rawSender) return;

    // Bersihkan Device ID dari JID & ambil nomor/user ID murni
    const senderJid = decodeJid(rawSender);
    const senderUser = jidDecode(senderJid)?.user || senderJid.split("@")[0];

    // --- 4. Ambil body teks (conversation / caption / text) ---
    const { body, content, contentType } = extractBody(rawMessage);

    // --- 5. Parse command ---
    const { text, command } = getCommand(body);

    // --- 5b. Resolusi Status Grup & Admin (Ditingkatkan) ---
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
        // Gunakan Optional Chaining & Boolean agar tidak melempar TypeError
        isAdmin = Boolean(participant?.admin || participant?.superadmin);
      }
    }

    // --- 6. Susun object m ---
    const m = {
      key,
      chat: key.remoteJid,
      addressingMode: key?.addressingMode,
      sender: senderJid,
      senderLid: key.remoteJidAlt,
      fromMe: key?.fromMe,
      contentType,
      content,
      isOwner: ownerNumber.has(senderUser),
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

    // --- 7. Fungsi m.reply ---
    m.reply = async (contentToReply, options = {}) => {
      try {
        if (contentToReply === undefined || contentToReply === null) return;

        let messageOptions = {};

        // A. JIKA INPUT ADALAH BUFFER
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
        // B. JIKA INPUT ADALAH STRING
        else if (typeof contentToReply === "string") {
          messageOptions = { text: contentToReply };
        }
        // C. JIKA INPUT ADALAH OBJEK
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

    // Cetak log masuk
    logs.info(
      `from : ${m.sender}\nmessage : ${m.body} \ndate : ${formatDateId(Date.now(), "medium")}`,
    );

    // Jalankan handler eksternal
    executeFn(command, { m, sock });

    // --- 8. Fitur Eval (Menggunakan > ) ---
    if (body && body.startsWith(">") && m.isOwner) {
      logs.debug("Menjalankan perintah evaluasi teks (eval)...");
      const scriptToExecute = body.slice(1).trim();

      try {
        let evaluated = eval(scriptToExecute);

        if (evaluated instanceof Promise) {
          evaluated = await evaluated;
        }

        if (typeof evaluated !== "string") {
          evaluated = util.inspect(evaluated, { depth: 2 });
        }

        await m.reply(evaluated);
      } catch (err) {
        await m.reply(String(err));
      }
    }
  } catch (error) {
    console.error("[messageUpsert] error fatal:", error);
  } finally {
    locked.delete(keyId);
  }
};

export { messageUpsert };