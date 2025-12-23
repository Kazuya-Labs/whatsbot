const { getContentType } = require("@whiskeysockets/baileys");
const messageUpsert = async (event, sock) => {
  try {
    const upsert = event.messages[0];
    const m = {};
    m.chatJid = upsert.key.jid; // KEY JID
    m.chatLid = upsert.key.remoteJidAlt; // KEY LID
    m.name = upsert.pushName;
    m.broadcast = upsert.broadcast;
    m.text = upsert.message.conversation || upsert.message.caption || null;
    m.contentType = getContentType(upsert.message);
    m.mimetype = upsert.message.mimetype;
    m.timeStamp = upsert.messageTimeStamp;
    // key
    m.key = upsert.key;
    m.participants = m.key.participant || null;
    m.participantAlt = m.key.participantAlt;
    m.addresMode = m.key.addressingMode; // PN = LID

    m.reply = async text => {
      try {
        await sock.sendMessage(m.senderJid, { text }, { quoted: upsert });
      } catch (e) {
        console.error(e);
      }
    };

    console.log({ m });
    console.log(`JSON.stringify(upsert):`, JSON.stringify(upsert, null, 2));
  } catch (e) {
    console.error(e);
  }
};

module.exports = messageUpsert;
