import { createReadStream, createWriteStream, readFileSync } from "fs";
import { stat, access, writeFile } from "fs/promises";
import { extname } from "path";
import { pipeline } from "stream";
import logs from "./logger.js";
import sharp from "sharp";

/**
 * Format ukuran Byte menjadi satuan yang mudah dibaca (KB, MB, GB).
 * @param {number} bytes - Ukuran dalam satuan Byte.
 * @returns {string} String ukuran terformat (contoh: "1.5 MB").
 */
export const formatSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Periksa apakah ukuran file dalam Buffer melebihi batas maksimum.
 * @param {Buffer} buffer - Objek Buffer file.
 * @param {number} maxMegabytes - Batas maksimal dalam MegaByte (MB).
 * @returns {boolean} True jika aman, False jika melebihi batas.
 */
export const checkMaxSize = (buffer, maxMegabytes) => {
  if (!Buffer.isBuffer(buffer))
    throw new TypeError("Input harus berupa Buffer");
  const maxSizeInBytes = maxMegabytes * 1024 * 1024;
  return buffer.length <= maxSizeInBytes;
};

/**
 * Ambil ekstensi file dalam huruf kecil (termasuk titik awal, contoh: .jpg).
 * @param {string} filename - Nama file lengkap.
 * @returns {string} Ekstensi file.
 */
export const getExtension = (filename) => {
  return extname(filename).toLowerCase();
};

/**
 * Validasi apakah file termasuk dalam daftar tipe MIME yang diizinkan.
 * @param {string} mimeType - Tipe MIME file (contoh: 'image/jpeg').
 * @param {string[]} allowedTypes - Daftar tipe MIME yang diizinkan.
 * @returns {boolean}
 */
export const isValidMimeType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};

/**
 * Periksa apakah suatu file ada di dalam sistem direktori tanpa membaca isinya.
 * @param {string} filePath - Jalur lengkap ke file.
 * @returns {Promise<boolean>} True jika file ada, False jika tidak ada.
 */
export const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Ambil ukuran file langsung dari sistem tanpa memuatnya ke dalam Buffer (Efisien untuk file besar).
 * @param {string} filePath - Jalur lengkap ke file.
 * @returns {Promise<number>} Ukuran dalam Byte.
 */
export const getDiskFileSize = async (filePath) => {
  const fileStat = await stat(filePath);
  return fileStat.size;
};

/**
 * Mendapatkan ukuran file dari piringan (disk) tanpa memuat isinya ke memori.
 * @param {string} filePath - Jalur lengkap ke file.
 * @returns {Promise<number>} Ukuran file dalam satuan Byte.
 */
export const getFileSizeFromDisk = async (filePath) => {
  const fileStat = await stat(filePath);
  return fileStat.size;
};

/**
 * Menyalin file besar secara efisien menggunakan Stream (Chunk-by-Chunk).
 * Menggunakan memori yang sangat konstan (biasanya hanya ~64KB per chunk).
 *
 * @param {string} sourcePath - Jalur file sumber.
 * @param {string} destinationPath - Jalur file tujuan.
 * @returns {Promise<void>}
 */
export const copyFileWithStream = async (sourcePath, destinationPath) => {
  const readStream = createReadStream(sourcePath);
  const writeStream = createWriteStream(destinationPath);

  // pipeline otomatis menangani penutupan stream dan error handling
  await pipeline(readStream, writeStream);
};

/**
 * Melakukan pemrosesan atau validasi data per chunk dari file besar (Contoh: mencari kata kunci).
 *
 * @param {string} filePath - Jalur file.
 * @param {Function} onChunk - Fungsi callback yang dijalankan setiap kali chunk data diterima.
 * @returns {Promise<void>}
 */
export const processFileByChunks = async (filePath, onChunk) => {
  const readStream = createReadStream(filePath, {
    highWaterMark: 64 * 1024, // Mengatur ukuran maksimal per chunk (contoh: 64 KB)
  });

  for await (const chunk of readStream) {
    // chunk di sini berupa Buffer kecil
    onChunk(chunk);
  }
};

/**
 *
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
