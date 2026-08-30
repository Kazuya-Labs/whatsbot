import { downloadMediaMessage, getContentType } from "baileys";
import { groupCache } from "#connection/cache.js";
import { mediaMessageFor, compressImageBuffer } from "#utils/media.js";
import { createPlugin } from "#utils/plugin.js";
import { isGroupJid } from "#utils/jid.js";
import { extractTextFromContent } from "#connection/parse.js";

const STATUS_JID = "status@broadcast";
const ALL_GROUPS_KEY = "all";

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

/**
 * Daftar semua grup tempat bot bergabung, di-cache di `groupCache`
 * (key "all", TTL standar 5 menit) supaya `groupFetchAllParticipating`
 * tidak dipanggil berulang (hindari over-limit). Di-invalidasi otomatis
 * pada event groups.update / group-participants.update.
 *
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @returns {Promise<string[]>}
 */
export const allGroupsFor = async (sock) => {
  const cached = groupCache.get(ALL_GROUPS_KEY);
  if (Array.isArray(cached)) return cached;

  const metadata = (await sock.groupFetchAllParticipating?.()) || {};
  const jids = Object.keys(metadata);
  groupCache.set(ALL_GROUPS_KEY, jids);
  return jids;
};

const isStatusMediaType = (contentType) =>
  ["imageMessage", "videoMessage", "audioMessage"].includes(contentType);

const isRejectedType = (contentType) =>
  ["stickerMessage", "documentMessage"].includes(contentType);

/**
 * Susun konten status dari pesan yang di-reply.
 * Download & kompres media cukup sekali (efisien, 1 upload).
 *
 * @param {object} quoted - `m.quoted`.
 * @param {Function} downloader - downloader media (default baileys).
 * @returns {Promise<{ content: object|null, rejected: string|null }>}
 */
export const buildStatusContent = async (
  quoted,
  downloader = downloadMediaMessage,
) => {
  const contentType = getContentType(quoted?.content || null);
  const inner = quoted?.content?.[contentType] || null;

  if (isRejectedType(contentType)) {
    return { content: null, rejected: `${contentType} tidak didukung untuk status.` };
  }

  if (isStatusMediaType(contentType)) {
    const virtualMessage = {
      key: quoted.key || {},
      message: quoted.content,
    };
    const buffer = await downloader(virtualMessage, "buffer", {});

    if (contentType === "imageMessage") {
      const optimized = await compressImageBuffer(buffer);
      return {
        content: { image: optimized, caption: inner?.caption || "" },
        rejected: null,
      };
    }
    if (contentType === "videoMessage") {
      return {
        content: mediaMessageFor(buffer, {
          mimetype: inner?.mimetype || "video/mp4",
          caption: inner?.caption,
        }),
        rejected: null,
      };
    }
    return {
      content: {
        audio: buffer,
        mimetype: inner?.mimetype || "audio/mpeg",
        ptt: Boolean(inner?.ptt),
      },
      rejected: null,
    };
  }

  if (inner) {
    return {
      content: { text: extractTextFromContent(inner, contentType) },
      rejected: null,
    };
  }

  return { content: null, rejected: "Pesan yang di-reply tidak punya konten yang bisa dijadikan status." };
};

/**
 * Inti swgc: upload status SEKALI ke status@broadcast, menandai `groups`
 * lewat `statusJidList` (grup-grup tersebut melihat/tag di status).
 *
 * @param {object} params
 * @param {ReturnType<typeof import('baileys').makeWASocket>} params.sock
 * @param {object} params.m - objek pesan (harus punya `.quoted`).
 * @param {string[]} params.groups - JID grup yang akan ditandai.
 * @param {Function} [params.downloader] - downloader media (default baileys).
 * @returns {Promise<{ posted: boolean, tagged: number, rejected: string|null }>}
 */
export const swgcStatusCore = async ({
  sock,
  m,
  groups,
  downloader = downloadMediaMessage,
}) => {
  const { content, rejected } = await buildStatusContent(m.quoted, downloader);

  if (rejected) return { posted: false, tagged: 0, rejected };

  await sock.sendMessage(STATUS_JID, content, { statusJidList: groups });
  return { posted: true, tagged: groups.length, rejected: null };
};

export default createPlugin({
  names: ["swgc"],
  description: "Upload status sekali, tag ke grup yang ditulis (atau all)",
  run: async ({ m, sock }) => {
    const raw = String(m.text ?? "").trim();

    if (!raw) {
      return m.reply(
        "Format: balas pesan lalu ketik `.swgc all` (semua grup) atau\n" +
          "`.swgc idgrup1,idgrup2,...` (tag grup tertentu)\n" +
          "Contoh: `.swgc 628xxx@g.us,628yyy@g.us`",
      );
    }

    if (!m.quoted) {
      return m.reply("Tidak ada pesan yang di-reply. Balas pesan/media dulu.");
    }

    let groups = [];
    let invalid = [];
    let isAll = false;

    if (raw === "all") {
      isAll = true;
      groups = await allGroupsFor(sock);
    } else {
      const parsed = parseGroupIds(raw);
      groups = parsed.groups;
      invalid = parsed.invalid;
    }

    if (groups.length === 0) {
      return m.reply(
        isAll
          ? "Bot tidak berada di grup mana pun — tidak ada yang bisa ditandai."
          : "Tidak ada ID grup valid. Gunakan `.swgc all` atau `.swgc idgrup1,idgrup2,...`.",
      );
    }

    try {
      const { posted, tagged, rejected } = await swgcStatusCore({
        sock,
        m,
        groups,
      });

      if (rejected) return m.reply(`⚠️ ${rejected}`);

      let summary = `✅ *swgc* — 1 status di-upload, menandai ${tagged} grup`;
      if (invalid.length > 0) {
        summary += `\n⚠️ Diabaikan (bukan ID grup): ${invalid.join(", ")}`;
      }

      return m.reply(summary);
    } catch (error) {
      return m.reply(`Gagal upload status: ${error.message}`);
    }
  },
});