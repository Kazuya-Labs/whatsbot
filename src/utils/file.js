import { createReadStream, createWriteStream, readFileSync } from "fs";
import { stat, access, writeFile } from "fs/promises";
import { extname } from "path";
import { pipeline } from "stream";
import logs from "./logger.js";
import sharp from "sharp";

/** Format ukuran Byte menjadi KB/MB/GB. @param {number} bytes @returns {string} */
export const formatSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

/** True jika ukuran Buffer <= maxMegabytes. @param {Buffer} buffer @param {number} maxMegabytes @returns {boolean} */
export const checkMaxSize = (buffer, maxMegabytes) => {
  if (!Buffer.isBuffer(buffer))
    throw new TypeError("Input harus berupa Buffer");
  const maxSizeInBytes = maxMegabytes * 1024 * 1024;
  return buffer.length <= maxSizeInBytes;
};

/** Ekstensi file huruf kecil termasuk titik (contoh: .jpg). @param {string} filename @returns {string} */
export const getExtension = (filename) => {
  return extname(filename).toLowerCase();
};

/** @param {string} mimeType @param {string[]} allowedTypes @returns {boolean} */
export const isValidMimeType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};

/** @param {string} filePath @returns {Promise<boolean>} */
export const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

/** Ukuran file dari disk tanpa memuat isinya. @param {string} filePath @returns {Promise<number>} */
export const getDiskFileSize = async (filePath) => {
  const fileStat = await stat(filePath);
  return fileStat.size;
};

/**
 * Salin file besar via stream (memori konstan per chunk).
 * @param {string} sourcePath
 * @param {string} destinationPath
 * @returns {Promise<void>}
 */
export const copyFileWithStream = async (sourcePath, destinationPath) => {
  const readStream = createReadStream(sourcePath);
  const writeStream = createWriteStream(destinationPath);

  // pipeline menangani penutupan stream + error
  await pipeline(readStream, writeStream);
};

/**
 * Proses file besar per-chunk (mis. cari kata kunci).
 * @param {string} filePath
 * @param {Function} onChunk
 * @returns {Promise<void>}
 */
export const processFileByChunks = async (filePath, onChunk) => {
  const readStream = createReadStream(filePath, {
    highWaterMark: 64 * 1024, // ukuran chunk (64 KB)
  });

  for await (const chunk of readStream) {
    onChunk(chunk);
  }
};

/**
 * @param {import("fs").PathLike} pathdir - path location
 * @returns {Object}
 */
export const readJsonFile = (pathdir) => {
  const rawdata = readFileSync(pathdir, {
    encoding: "utf-8",
  });
  return JSON.parse(rawdata);
};

export const writeJsonFile = async (pathdir, newData) => {
  const oldData = readJsonFile(pathdir);
  const merge = Object.assign(oldData, newData);
  return await writeFile(pathdir, merge).catch((reason) => {
    logs.error(reason);
    return null;
  });
};

export const compressImage = async (inputPath, outputPath) => {
  await sharp(inputPath)
    .resize({ width: 1080 }) // cukup buat carousel, ga perlu lebih besar
    .jpeg({ quality: 75 })
    .toFile(outputPath);
};
