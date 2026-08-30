import { downloadMediaMessage, getContentType } from "baileys";
import { mediaMessageFor, compressImageBuffer } from "#utils/media.js";
import { createPlugin } from "#utils/plugin.js";
import { isGroupJid } from "#utils/jid.js";
import { extractTextFromContent } from "#connection/parse.js";

/**
 * Parsing daftar ID grup dari argumen (dipisah koma/whitespace).
 * Murni sehingga mudah diuji.
 *
 * @param {string} [text]
 * @returns {{ groups: string[], invalid: string[] }}
 */
export const parseGroupIds = (text) => {
  const tokens = String(text ?? "")
    .split(/[,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const groups = [];
  const invalid = [];

  for (const token of tokens) {
    if (isGroupJid(token)) {
      if (!groups.includes(token)) groups.push(token);
    } else {
      invalid.push(token);
    }
  }

  return { groups, invalid };
};

const isMediaType = (contentType) =>
  [
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "documentMessage",
    "stickerMessage",
  ].includes(contentType);

/**
 * Inti broadcast reply -> N grup. `downloader` bisa disuntik untuk testing.
 *
 * @param {object} params
 * @param {ReturnType<typeof import('baileys').makeWASocket>} params.sock
 * @param {object} params.m - objek pesan (harus punya `.quoted`).
 * @param {string[]} params.groups - daftar JID grup valid.
 * @param {Function} [params.downloader] - downloader media (default baileys).
 * @returns {Promise<{ sent: number, failed: Array<[string,string]> }>}
 */
export const swgcCore = async ({
  sock,
  m,
  groups,
  downloader = downloadMediaMessage,
}) => {
  const quoted = m.quoted;
  const contentType = getContentType(quoted?.content || null);
  const inner = quoted?.content?.[contentType] || null;
  const useDown = downloader;

  const buildPayload = async () => {
    if (isMediaType(contentType)) {
      const virtualMessage = {
        key: quoted.key || {},
        message: quoted.content,
      };
      const buffer = await useDown(virtualMessage, "buffer", {});

      if (contentType === "imageMessage") {
        const optimized = await compressImageBuffer(buffer);
        return { image: optimized, caption: inner?.caption || "" };
      }
      if (contentType === "videoMessage") {
        return mediaMessageFor(buffer, {
          mimetype: inner?.mimetype || "video/mp4",
          fileName: inner?.fileName,
          caption: inner?.caption,
        });
      }
      if (contentType === "audioMessage") {
        return {
          audio: buffer,
          mimetype: inner?.mimetype || "audio/mpeg",
          ptt: Boolean(inner?.ptt),
        };
      }
      if (contentType === "stickerMessage") {
        return { sticker: buffer };
      }
      return mediaMessageFor(buffer, {
        mimetype: inner?.mimetype || "application/pdf",
        fileName: inner?.fileName || "file",
        caption: inner?.caption,
      });
    }

    if (inner) {
      return { text: extractTextFromContent(inner, contentType) };
    }

    return null;
  };

  const payload = await buildPayload();

  const failed = [];
  let sent = 0;

  if (payload) {
    for (const group of groups) {
      try {
        await sock.sendMessage(group, payload);
        sent++;
      } catch (error) {
        failed.push([group, error.message || String(error)]);
      }
    }
  }

  return { sent, failed };
};

export default createPlugin({
  names: ["swgc"],
  description: "Broadcast pesan reply ke beberapa grup (dipisah koma)",
  run: async ({ m, sock }) => {
    const { groups, invalid } = parseGroupIds(m.text);

    if (groups.length === 0) {
      return m.reply(
        "Format: balas pesan lalu ketik `.swgc idgrup1,idgrup2,...`\n" +
          "Contoh: `.swgc 628xxx@g.us,628yyy@g.us`",
      );
    }

    if (!m.quoted) {
      return m.reply("Tidak ada pesan yang di-reply. Balas pesan/media dulu.");
    }

    try {
      const { sent, failed } = await swgcCore({ sock, m, groups });

      let summary = `✅ *swgc* — terkirim ke ${sent}/${groups.length} grup`;
      if (invalid.length > 0) {
        summary += `\n⚠️ Diabaikan (bukan ID grup): ${invalid.join(", ")}`;
      }
      if (failed.length > 0) {
        summary += `\n❌ Gagal: ${failed.map(([g]) => g).join(", ")}`;
      }

      return m.reply(summary);
    } catch (error) {
      return m.reply(`Gagal memproses pesan: ${error.message}`);
    }
  },
});