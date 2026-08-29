import fs from "node:fs";
import path from "node:path";
import logs from "./logger.js";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

/**
 * Gabung object dalam (array diganti, object direkursi).
 * @param {object} base
 * @param {object} override
 * @returns {object}
 */
const deepMerge = (base, override) => {
  const out = { ...base };
  const overrides = override ?? {};

  for (const key of Object.keys(overrides)) {
    const b = base[key];
    const v = overrides[key];
    if (
      b &&
      typeof b === "object" &&
      !Array.isArray(b) &&
      v &&
      typeof v === "object" &&
      !Array.isArray(v)
    ) {
      out[key] = deepMerge(b, v);
    } else {
      out[key] = v;
    }
  }

  return out;
};

/** Konfigurasi bawaan — dipakai saat key tidak terisi di config.json. */
const DEFAULT_CONFIG = {
  ownerNumbers: [],
  prefixes: ["!", "."],
  eval: { enabled: true, prefix: ">" },
  messages: {
    owner: "❌ Perintah ini hanya dapat digunakan oleh Owner Bot!",
    admin: "❌ Perintah ini hanya dapat digunakan oleh Admin Grup!",
    groups: "❌ Perintah ini hanya dapat digunakan di dalam Grup!",
    private: "❌ Perintah ini hanya dapat digunakan di dalam chat Private!",
    genericError: "Terjadi kesalahan pada sistem.",
  },
  bot: {
    name: "whatsend",
    footer: "",
    defaultJeda: 5000,
  },
  reconnect: {
    maxAttempts: 3,
    delayMs: 5000,
  },
  socket: {
    browser: { type: "ubuntu", name: "Chrome" },
    connectTimeoutMs: 60000,
    maxMsgRetryCount: 2,
    keepAliveIntervalMs: 30000,
  },
  pairingPrompt: "Masukan nomor hp : ",
};

/**
 * Baca config.json lalu merge dengan default.
 * @returns {object} config aktif.
 */
export const loadConfig = () => {
  let fileConfig = {};
  try {
    fileConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  } catch (error) {
    logs.warn("config.json tidak terbaca/tidak valid, memakai default:", error.message);
  }

  const config = deepMerge(DEFAULT_CONFIG, fileConfig);

  if (!Array.isArray(config.ownerNumbers) || config.ownerNumbers.length === 0) {
    logs.warn("config.ownerNumbers kosong — tidak ada owner terdaftar.");
  }

  return config;
};

/**
 * Ambil config aktif — dibaca live dari file setiap pemanggilan,
 * sehingga edit config.json langsung berlaku tanpa restart.
 * @returns {object}
 */
export const getConfig = () => loadConfig();

/** Baca ulang config.json (alias loadConfig). */
export const reloadConfig = () => loadConfig();

/**
 * Cek apakah nomor adalah owner (sesuai config.ownerNumbers).
 * @param {string|number|null|undefined} userNumber
 * @returns {boolean}
 */
export const isOwner = (userNumber) =>
  getConfig().ownerNumbers.includes(String(userNumber));

/** Daftar prefix command aktif. @returns {string[]} */
export const getPrefixes = () => getConfig().prefixes;