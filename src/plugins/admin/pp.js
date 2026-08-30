import { downloadMediaMessage } from "baileys";
import { createPlugin } from "#utils/plugin.js";
import { parseArgs } from "#utils/args.js";

/**
 * Ambil media gambar: dari reply (quoted) atau pesan image itu sendiri.
 * Murni sehingga mudah diuji.
 * @param {object} m - objek pesan
 * @returns {{ virtual: object, caption: string|null }|null}
 */
export const imageFor = (m) => {
  if (m.quoted?.content?.imageMessage) {
    return {
      virtual: { key: m.quoted.key || { remoteJid: m.chat }, message: m.quoted.content },
      caption: m.quoted.content.imageMessage.caption || null,
    };
  }
  if (m.contentType === "imageMessage" && m.content) {
    return {
      virtual: { key: m.key, message: { imageMessage: m.content } },
      caption: m.content.caption || null,
    };
  }
  return null;
};

/**
 * Inti set foto grup. `downloader` bisa disuntik untuk testing.
 *
 * @param {object} params
 * @param {object} params.m - objek pesan
 * @param {ReturnType<typeof import('baileys').makeWASocket>} params.sock
 * @param {Function} [params.downloader]
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export const setGroupPpCore = async ({
  m,
  sock,
  downloader = downloadMediaMessage,
}) => {
  const source = imageFor(m);
  if (!source) {
    return { ok: false, message: "Reply sebuah gambar (atau kirim gambar) untuk dijadikan foto grup.\n`.pp del` untuk menghapus." };
  }

  try {
    const buffer = await downloader(source.virtual, "buffer", {});
    await sock.updateProfilePicture(m.chat, buffer);
    return { ok: true, message: "✅ Foto grup diperbarui." };
  } catch (error) {
    return { ok: false, message: `Gagal set foto grup: ${error.message}` };
  }
};

export default createPlugin({
  names: ["pp", "setpp", "setppgroup"],
  description: "Set/hapus foto grup (reply gambar / .pp del)",
  run: async ({ m, sock }) => {
    if (parseArgs(m.text)[0]?.toLowerCase() === "del") {
      await sock.removeProfilePicture(m.chat);
      return m.reply("✅ Foto grup dihapus.");
    }

    const result = await setGroupPpCore({ m, sock });
    return m.reply(result.message);
  },
});