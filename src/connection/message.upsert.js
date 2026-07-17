import { getContentType,jidDecode,proto, S_WHATSAPP_NET } from "baileys";
import util from "util"; // PENTING: Diperlukan untuk util.inspect pada ESM
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
const ownerNumber = new Set(["6285728153452", "62882005824862"])

const locked = new Set();

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

    // --- 2. Resolusi sender: wajib @s.whatsapp.net ---
    const senderJid = resolveSenderJid(key);
    if (!senderJid) return;

    // --- 4. Ambil body teks (conversation / caption / text) ---
    const { body, content, contentType } = extractBody(rawMessage);

    // --- 5. Parse command ---
    const { text, command } = getCommand(body);
    let isAdmin, metadata;
    if (isGroup) {
      metadata = await metadataGroup(sock, key.remoteJid);
      isAdmin = metadata?.participants?.find(
        (participant) => participant.phoneNumber == senderJid,
      ).admin;
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
      isOwner: ownerNumber.has(jidDecode(senderJid).user),
      body,
      metadata,
      isAdmin,
      isGroup: isGroup(key?.remoteJid),
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

    // --- 7. Fungsi m.reply Super Bandel & Cerdas ---
    m.reply = async (contentToReply, options = {}) => {
      try {
        if (contentToReply === undefined || contentToReply === null) return;

        let messageOptions = {};

        // A. JIKA INPUT ADALAH BUFFER (Deteksi otomatis tipe file)
        if (Buffer.isBuffer(contentToReply)) {
          const typeInfo = m.contentType;
          const mime = m.mimeType;

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
        // C. JIKA INPUT ADALAH OBJEK (Struktur kustom Baileys)
        else if (typeof contentToReply === "object") {
          messageOptions = { ...contentToReply };
        }

        // Fitur otomatis mengutip (quoted) pesan asli
        if (options.quoted !== false) {
          messageOptions.quoted = upsert;
        }

        // Gabungkan contextInfo kustom jika ada (misal untuk mention)
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

    // Jalankan handler eksternal Anda
    executeFn(command, { m, sock });

    // --- 8. Fitur Eval PINAL (Menggunakan > ) ---
    if (body && body.startsWith(">") && m.isOwner) {
      logs.debug("Menjalankan perintah evaluasi teks (eval)...");
      const scriptToExecute = body.slice(1).trim();

      try {
        // Mengeksekusi string kode JavaScript secara langsung
        let evaluated = eval(scriptToExecute);

        // Jika hasilnya berupa Promise (async), tunggu pemrosesan selesai
        if (evaluated instanceof Promise) {
          evaluated = await evaluated;
        }

        // Jika hasilnya bukan string, ubah menjadi struktur objek visual terformat
        if (typeof evaluated !== "string") {
          evaluated = util.inspect(evaluated, { depth: 2 });
        }

        // Kirim hasil menggunakan m.reply pintar
        await m.reply(evaluated);
      } catch (err) {
        // Jika kode Javascript yang dimasukkan salah/eror, kirim pesan erornya ke WA
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
