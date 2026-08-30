import {
  Browsers,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeWASocket,
  useMultiFileAuthState,
} from "baileys";
import delay from "delay";
import readline from "readline";
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
      printQRInTerminal: false,
      version,
      fireInitQueries: false,
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

    if (!sock.authState.creds.registered) {
      const nomor = await question(getConfig().pairingPrompt);
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
    await initStorage();
    await registerPlugin(pathdir);
    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("messages.upsert", (event) => {
      messageUpsert(event, sock);
    });
    sock.ev.on("connection.update", (update) => {
      connectionUpdate(update, sock, start);
    });
    const invalidateAllGroups = () => groupCache.del("all");
    sock.ev.on("groups.update", invalidateAllGroups);
    sock.ev.on("group-participants.update", invalidateAllGroups);
  } catch (error) {
    logs.error(error);
  }
};

export { start };