import { groupCache } from "./cache.js";

/**
 * Ambil metadata grup, di-cache di `groupCache` (TTL 5 menit) untuk
 * menghindari network fetch `sock.groupMetadata()` pada setiap pesan grup.
 *
 * Catatan: `sock.groupMetadata()` (Baileys 7) TIDAK memakai option socket
 * `cachedGroupMetadata` — selalu network. Jadi kita cache manual di sini.
 *
 * @param {ReturnType<typeof makeWASocket>} sock
 * @param {import('baileys').JidServer} jid
 * @returns {Promise<import('baileys').GroupMetadata|null>}
 */
const metadataGroup = async (sock, jid) => {
  if (!jid) return null;

  const cached = groupCache.get(jid);
  if (cached) return cached;

  try {
    const metadata = await sock.groupMetadata(jid);
    groupCache.set(jid, metadata);
    return metadata;
  } catch (error) {
    return null;
  }
};

export { metadataGroup };
