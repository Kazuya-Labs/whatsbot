import {
  Browsers,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  useMultiFileAuthState,
} from "baileys";
import delay from "delay";
import readline from "readline";
import qrcode from "qrcode-terminal";
import path from "path";
import P from "pino";
import { groupCache, msgRetryCache } from "./cache.js";
import { connectionUpdate } from "./update.js";
import { messageUpsert } from "./message.js";
import { registerPlugin } from "#plugin/register.js";
import { initStorage } from "#storage/campaigns.js";
import logs from "#utils/logger.js";
import { getConfig } from "#utils/config.js";

const question = (text) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(text, (answer) => {
      rl.close();
      resolve(answer);
    }),
  );
};

// Memo pilihan metode pairing + status inisialisasi, agar prompt menu & nomor
// tidak berulang tiap QR re-emit (Baileys mengirim QR baru tiap ~20 detik).
let pairingMethodChoice = null;
let pairingInitiated = false;

/**
 * Tentukan metode pairing: konfigurasi (`pairingMethod`) atau pilihan interaktif.
 * @returns {"qr"|"pairing"}
 */
const resolvePairingMethod = async () => {
  if (pairingMethodChoice) return pairingMethodChoice;
  const configured = getConfig().pairingMethod;
  if (configured === "qr" || configured === "pairing") return configured;

  // "ask" (default) -> minta user memilih sekali per proses
  const answer = (await question(getConfig().pairingMethodPrompt)).trim();
  pairingMethodChoice = answer === "2" ? "pairing" : "qr";
  return pairingMethodChoice;
};

/**
 * Tangani QR code: cetak sebagai QR di terminal lalu tunggu di-scan.
 * @param {string} qr
 */
const handleQr = (qr) => {
  console.log(
    "\n📱 Scan QR di bawah dengan WhatsApp > Setelan > Perangkat Tertaut > Tautkan Perangkat:",
  );
  qrcode.generate(qr, { small: true });
  console.log("");
};

/**
 * Tangani pairing code: minta nomor lalu tampilkan kode (6 digit dengan tanda "-").
 * @param {ReturnType<typeof makeWASocket>} sock
 */
const handlePairing = async (sock) => {
  if (pairingInitiated) return;
  pairingInitiated = true;

  const nomor = await question(getConfig().pairingPrompt);
  console.log("🚀 ~ starting ~ nomor:", nomor);
  await delay(3000);
  const codePairing = await sock
    .requestPairingCode(nomor.trim())
    .catch((err) => {
      logs.error("Gagal pairing code:", err);
      return null;
    });
  if (codePairing) {
    logs.info("code pairing ", codePairing.slice(0, 4) + "-" + codePairing.slice(4));
  }
};

const start = async () => {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("auth_info_baileys");
    const { isLatest, version } = await fetchLatestBaileysVersion();

    const logger = P({ level: "warn" });

    const sockCfg = getConfig().socket;

    const browserFn = Browsers[sockCfg?.browser?.type];
    const browser =
      (typeof browserFn === "function" && browserFn(sockCfg.browser.name)) ||
      Browsers.ubuntu("Chrome");

    /** @type {ReturnType<typeof makeWASocket>} */
    const sock = makeWASocket({
      markOnlineOnConnect: false,
      logger,
      connectTimeoutMs: sockCfg?.connectTimeoutMs ?? 60000,
      browser,
      cachedGroupMetadata: (jid) => groupCache.get(jid),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache: msgRetryCache,
      maxMsgRetryCount: sockCfg?.maxMsgRetryCount ?? 2,
      syncFullHistory: false,
      version,
      transactionOpts: {
        maxCommitRetries: 10,
        delayBetweenTriesMs: 300,
      },
      enableRecentMessageCache: true,
      generateHighQualityLinkPreview: false,
      downloadHistory: false,
      options: {
        timeout: 120_000,
      },
      keepAliveIntervalMs: sockCfg?.keepAliveIntervalMs ?? 30_000,
    });

    const pathdir = path.join(process.cwd(), "src", "plugins");
    await initStorage();
    await registerPlugin(pathdir);
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (event) => {
      messageUpsert(event, sock);
    });
    sock.ev.on("connection.update", async (update) => {
      const { qr } = update;

      if (qr && !sock.authState.creds.registered) {
        const method = await resolvePairingMethod();
        if (method === "qr") {
          handleQr(qr);
        } else {
          await handlePairing(sock);
        }
      }

      connectionUpdate(update, sock, start);
    });
    // Invalidasi cache metadata grup (per-jid + daftar "all") agar status
    // admin (`isAdmin`) tetap akurat tanpa fetch berlebih.
    const invalidateGroup = (jid) => {
      groupCache.del(jid);
      groupCache.del("all");
    };
    sock.ev.on("groups.update", (updates) => {
      for (const u of updates) invalidateGroup(u.id);
    });
    sock.ev.on("group-participants.update", (event) =>
      invalidateGroup(event.id),
    );
  } catch (error) {
    logs.error(error);
  }
};

export { start };