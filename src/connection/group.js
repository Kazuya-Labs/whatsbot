/**
 * @param {ReturnType<typeof makeWASocket>} sock
 * @param {import('baileys').JidServer} jid
 * @returns {Promise<import('baileys').GroupMetadata|null>}
 */
const metadataGroup = async (sock, jid) => {
  try {
    return await sock.groupMetadata(jid);
  } catch (error) {
    return null;
  }
};

export { metadataGroup };