import {
  Browsers,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
  makeWASocket,
  proto,
  useMultiFileAuthState,
} from "baileys";
import delay from "delay";
import readline from "readline";
import { messageUpsert } from "./src/connection/message.upsert.js";
import { connectionUpdate } from "./src/connection/connection.update.js";
import logs from "./src/utils/logs.js";
import { loadPlugins } from "./src/pluginHandler/loadPlugins.js";
import { registerPlugin } from "./src/pluginHandler/registerPlugin.js";
import path from "path";
import P from "pino";
import { Agent } from "http";
import NodeCache from "node-cache";

const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });
const msgRetryCache = new NodeCache({ stdTTL: 60 * 60, useClones: false }); // instance terpisah

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

const starting = async () => {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("auth_info_baileys");
    const { isLatest, version } = await fetchLatestBaileysVersion();

    const logger = P({ level: "warn" });

    /** @type {ReturnType<typeof makeWASocket>} */
    const sock = makeWASocket({
      markOnlineOnConnect: false,
      logger,
      connectTimeoutMs: 60000,
      browser: Browsers.ubuntu("Chrome"),
      cachedGroupMetadata: (jid) => groupCache.get(jid),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      msgRetryCounterCache: msgRetryCache,
      maxMsgRetryCount: 2,
      syncFullHistory: false,
      printQRInTerminal: false,
      version,
      // shouldSyncHistoryMessage: () => false,
      fireInitQueries: false,
      transactionOpts: {
        maxCommitRetries: 10,
        delayBetweenTriesMs: 300,
      },
      enableRecentMessageCache: true,
      generateHighQualityLinkPreview: false,
      downloadHistory: false,
      options:{
         timeout: 120_000,
      },
      keepAliveIntervalMs: 30_000,
    });

    if (!sock.authState.creds.registered) {
      const nomor = await question("Masukan nomor hp : ");
      console.log("🚀 ~ starting ~ nomor:", nomor);
      await delay(3000);
      const codePairing = await sock
        .requestPairingCode(nomor.trim())
        .catch(null);
      if (!codePairing) throw new Error("Gagal pairing code");
      logs.info(
        "code pairing ",
        codePairing.slice(0, 4) + "-" + codePairing.slice(4),
      );
    }
    const pathdir = path.join(process.cwd(), "src", "plugins");
    registerPlugin(pathdir);
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (event) => {
      messageUpsert(event, sock);
    });
    sock.ev.on("connection.update", (update) => {
      connectionUpdate(update, sock);
    });
  } catch (error) {
    logs.error(error);
  }
};

starting();

export { starting };
