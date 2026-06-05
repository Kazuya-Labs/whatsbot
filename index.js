import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  Browsers,
  fetchLatestBaileysVersion,
  delay,
} from "@whiskeysockets/baileys";
import readline from "readline/promises";
import P from "pino";
import NodeCache from "node-cache";

import messageUpsert from "./connection/MessageUpsert.js";
import handleConnection from "./connection/handleConnect.js";
import { registerProduk } from "./bussines-logic/index.js";

const logger = P({ level: "silent" });

const msgRetryCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 30,
  useClones: false,
});

async function generateCode(sock) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const input = await rl.question(
      "🔹 Masukan Nomor WhatsApp (Contoh: 628xxx): ",
    );
    const number = input.replace(/[^0-9]/g, "");

    if (!number) {
      console.log("❌ Nomor tidak valid!");
      rl.close();
      return generateCode(sock);
    }

    console.log("⏳ Meminta pairing code ke server WhatsApp...");
    const code = await sock.requestPairingCode(number);
    console.log(`\n✅ [PAIRING CODE ANDA]: ${code}\n`);

    await delay(3000);
  } catch (err) {
    console.error("❌ Gagal generate pairing code:", err.message);
    console.log("Mencoba ulang proses...");
    return generateCode(sock);
  } finally {
    rl.close();
  }
}

async function start() {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("baileys_auth_info");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    if (process.env.DEBUG) {
      console.log(
        `ℹ️ Menggunakan Baileys v${version.join(".")} (Terbaru: ${isLatest})`,
      );
    }

    const getMessage = async (key) => {
      const msg = msgRetryCache.get(key.id);
      return msg?.message || undefined;
    };

    const sock = makeWASocket({
      version,
      logger,
      getMessage,
      fromMe: false,
      printQRInTerminal: false,
      syncFullHistory: false,
      downloadHistory: false,
      msgRetryCounterCache: msgRetryCache,
      generateHighQualityLinkPreview: false,
      markOnlineOnConnect: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.ubuntu("Chrome"),
    });

    if (!sock.authState.creds.registered) {
      console.log("ℹ️ Perangkat belum terintegrasi.");
      process.nextTick(async () => {
        try {
          await generateCode(sock);
        } catch (e) {
          console.error("Proses pairing terhenti:", e.message);
        }
      });
    }

    registerProduk();
    setInterval(
      () => {
        registerProduk();
      },
      1000 * 60 * 60 * 8,
    );

    sock.ev.on("connection.update", async (update) => {
      await handleConnection(update, start, sock);
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (event) => {
      messageUpsert(event, sock);
    });

    return sock;
  } catch (err) {
    console.error("💥 Gagal menginisialisasi core socket:", err);
    await delay(5000);
    return start();
  }
}

start();
