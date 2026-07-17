
/**
 *
 *  @param {ReturnType<typeof makeWASocket>} sock -
 *  @param {import('baileys').JidServer} jid
 * @returns {import('baileys').GroupMetadata}
 */
const metadataGroup = async (sock, jid) => {
  try {
    return await sock.groupMetadata(jid);
  } catch (error) {}
};

export { metadataGroup };
