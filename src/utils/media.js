import { checkMaxSize, getExtension } from "./file.js";

/** Pemetaan ekstensi file -> MIME type. */
const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Susun payload pesan media WhatsApp dari Buffer + metadata mime.
 * Murni (tanpa IO) sehingga mudah diuji.
 *
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {string} [opts.mimetype]
 * @param {string} [opts.fileName]
 * @param {string} [opts.caption]
 * @returns {object} payload untuk sock.sendMessage
 */
export const mediaMessageFor = (buffer, { mimetype, fileName, caption } = {}) => {
  const mime = mimetype || "application/octet-stream";

  if (mime.startsWith("image/")) return { image: buffer, caption };
  if (mime.startsWith("video/")) return { video: buffer, caption };
  if (mime.startsWith("audio/")) return { audio: buffer, mimetype: mime, caption };
  return { document: buffer, mimetype: mime, fileName: fileName || "file" };
};

/**
 * Unduh media dari URL lalu kirim ke chat (gambar/video/audio/dokumen).
 * Mime bisa ditebak dari ekstensi URL bila tidak ditegaskan.
 *
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.caption]
 * @param {string} [opts.mimetype]
 * @param {string} [opts.fileName]
 * @param {number} [opts.maxMb] - batas ukuran (dalam MB); throw bila melebihi.
 */
export const sendMediaFromUrl = async (sock, jid, { url, caption, mimetype, fileName, maxMb }) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal fetch media: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (maxMb && !checkMaxSize(buffer, maxMb)) {
    throw new Error(`Ukuran media melebihi ${maxMb} MB.`);
  }

  const detected = EXT_TO_MIME[getExtension(url)] || "application/octet-stream";
  const payload = mediaMessageFor(buffer, {
    mimetype: mimetype || detected,
    fileName: fileName || url.split("/").pop() || "file",
    caption,
  });

  return sock.sendMessage(jid, payload);
};