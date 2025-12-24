// dependencies
const { Boom } = require("@hapi/boom");
const path = require('path')
const fs = require("fs");
const {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  proto
} = require("@whiskeysockets/baileys");
const readline = require("readline").promises;
const P = require("pino");
const Handler = require("./utils/registerHandler");

// custom handlers
const handleMessage = require("./connection/MessageUpsert");
const handleConnection = require("./connection/handleConnect");
const App = require("./utils/serialize.js");
// readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// logger setup
const logger = P({ level: "silent" });

// helper: generate pairing code
async function generateCode(sock) {
  try {
    const input = await rl.question("Masukan Nomor : ");
    const number = parseInt(input);
    const code = await sock.requestPairingCode(number);
    console.log(`Your code : ${code}`);
  } catch (err) {
    console.error("Error generating code:", err);
  }
}

// main start function
async function start() {
  try {
    const { state, saveCreds } =
      await useMultiFileAuthState("baileys_auth_info");

    const sock = makeWASocket({
      printQRInTerminal: false,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      getMessage: () => proto.Message.create({ conversation: "test" })
    });

    // pairing code if not registered
    if (!sock.authState.creds.registered) {
      //fs.rmSync("./baileys_auth_info", { recursive: true, force: true });
      await generateCode(sock);
    }

    sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const status = new Boom(lastDisconnect?.error);
        if (reason === DisconnectReason.restartRequired) {
          start();
        }
        console.log({ status, reason });
      }

      if (connection === "open") {
        console.log("Koneksi terbuka ...");
        //    const decode = await sock.decodeJid(sock.user.id);
        //  console.log(decode);
        await Handler.register();
      }
    });

    const kazuya = new App(sock);

    sock.ev.on("messages.upsert", event => {
      handleMessage(event, kazuya);
    });
    sock.ev.on("creds.update", saveCreds);

    return sock;
  } catch (err) {
    console.error("Error starting socket:", err);
  }
}

// run
start();
