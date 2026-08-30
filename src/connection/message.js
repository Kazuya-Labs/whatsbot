import util from "util";
import { buildMessage } from "./messageBuilder.js";
import { executeFn, Handler } from "#plugin/handler.js";
import { formatDateId } from "#utils/datetime.js";
import logs from "#utils/logger.js";
import { getConfig } from "#utils/config.js";

const locked = new Set();

/**
 * @param {import('baileys').BaileysEventMap['messages.upsert']} ev
 * @param {ReturnType<typeof import('baileys').makeWASocket>} sock
 */
const messageUpsert = async (ev, sock) => {
  // Guard awal: hanya proses event notify
  if (ev.type !== "notify") return;

  const upsert = ev.messages[0];
  if (!upsert) return;

  const key = upsert.key;
  const keyId = key?.id;
  if (key.remoteJid === "status@broadcast") return;
  if (!keyId || locked.has(keyId)) return;

  locked.add(keyId);

  try {
    const m = await buildMessage({ upsert, sock });
    if (!m) return;

    // Cetak log masuk
    logs.info(
      `from : ${m.sender}\nmessage : ${m.body} \ndate : ${formatDateId(Date.now(), "medium")}`,
    );

    // Hook pesan (antilink/badword): jalan untuk pesan grup orang lain;
    // return `true` = pesan dikonsumsi, perintah tidak diproses.
    if (m.isGroup && !m.fromMe) {
      for (const hook of Handler.hooks) {
        try {
          if ((await hook(m, sock)) === true) return;
        } catch (hookError) {
          console.error("[messageUpsert] hook error:", hookError);
        }
      }
    }

    // Jalankan handler eksternal
    executeFn(m.command, { m, sock });

    // Fitur eval (hanya owner, prefix dari config)
    const evalCfg = getConfig().eval;
    const evalPrefix = evalCfg?.prefix ?? ">";
    if (
      evalCfg?.enabled &&
      m.body &&
      m.body.startsWith(evalPrefix) &&
      m.isOwner
    ) {
      logs.debug("Menjalankan perintah evaluasi teks (eval)...");
      const scriptToExecute = m.body.slice(evalPrefix.length).trim();

      try {
        let evaluated = eval(scriptToExecute);

        if (evaluated instanceof Promise) {
          evaluated = await evaluated;
        }

        if (typeof evaluated !== "string") {
          evaluated = util.inspect(evaluated, { depth: 2 });
        }

        await m.reply(evaluated);
      } catch (err) {
        await m.reply(String(err));
      }
    }
  } catch (error) {
    console.error("[messageUpsert] error fatal:", error);
  } finally {
    locked.delete(keyId);
  }
};

export { messageUpsert };