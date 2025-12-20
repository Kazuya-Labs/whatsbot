const { getContentType } = require("@whiskeysockets/baileys");
const messageUpsert = async (event, kazuya) => {
  try {
    const upsert = event.messages[0];
    const m = {};
    m.senderJid = upsert.key.jid;
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
    m.senderLid = m.key.remoteJidAlt;
    m.addresMode = m.key.addressingMode;

    console.log({ m });
    console.log(`JSON.stringify(upsert):`, JSON.stringify(upsert, null, 2));
  } catch (e) {
    console.error(e);
  }
};

module.exports = messageUpsert;
