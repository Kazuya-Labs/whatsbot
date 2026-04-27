const { getContentType } = require("@whiskeysockets/baileys");
const Handler = require("../utils/registerHandler");
const messageUpsert = async (event, sock) => {
  try {
    const upsert = event.messages[0];
    const m = {};
    m.chatJid = upsert.key.jid; // KEY JID
    m.chatLid = upsert.key.remoteJidAlt; // KEY LID
    m.name = upsert.pushName;
    m.broadcast = upsert.broadcast;
    m.text =
      upsert.message.conversation ||
      upsert.message.caption ||
      upsert.message?.extendedTextMessage?.text ||
      null;
    m.command = m?.text?.split(" ")[0] ?? null;
    m.contentType = getContentType(upsert.message);
    m.mimetype = upsert.message.mimetype;
    m.timeStamp = upsert.messageTimeStamp;
    // key
    m.key = upsert.key;
    m.participants = m.key.participant || null;
    m.participantAlt = m.key.participantAlt;
    m.addresMode = m.key.addressingMode; // PN = LID

    m.reply = async (text) => {
      try {
        await sock.sendMessage(m.chatLid, { text }, { quoted: upsert });
      } catch (e) {
        console.error(e);
      }
    };

    const dat = JSON.stringify(m, null, 2);
    console.log(dat);
    await Handler.executeFn(m.text, { m, sock });
  } catch (e) {
    console.error(e);
  }
};

module.exports = messageUpsert;
