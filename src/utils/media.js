import { checkMaxSize, getExtension } from "./file.js";
import sharp from "sharp";

/**
 * Kompres/resize gambar (Buffer) via sharp -> JPEG.
 * @param {Buffer} buffer
 * @param {object} [opts]
 * @param {number} [opts.width=1080]
 * @param {number} [opts.quality=80]
 * @returns {Promise<Buffer>}
 */
export const compressImageBuffer = async (
  buffer,
  { width = 1080, quality = 80 } = {},
) =>
  sharp(buffer)
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality })
    .toBuffer();

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

/** Unduh URL menjadi Buffer; throw bila status != 2xx. @param {string} url @returns {Promise<Buffer>} */
export const fetchBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
};

/**
 * Hapus pesan orang lain di chat (butuh admin/owner di grup).
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {{remoteJid: string, id?: string, participant?: string}} key
 * @returns {Promise<*>}
 */
export const deleteMessageFor = (sock, key) =>
  sock.sendMessage(key.remoteJid, {
    delete: {
      remoteJid: key.remoteJid,
      id: key.id,
      participant: key.participant,
      fromMe: false,
    },
  });

/**
 * Susun payload pesan media dari Buffer + mime.
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
 * Unduh media dari URL lalu kirim.
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 * @param {string} jid
 * @param {object} opts
 * @param {string} opts.url
 * @param {string} [opts.caption]
 * @param {string} [opts.mimetype]
 * @param {string} [opts.fileName]
 * @param {number} [opts.maxMb] - throw bila ukuran melebihi (MB).
 */
export const sendMediaFromUrl = async (sock, jid, { url, caption, mimetype, fileName, maxMb }) => {
  const buffer = await fetchBuffer(url);
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