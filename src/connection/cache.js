import NodeCache from "node-cache";

/**
 * Bungkus `.set` agar menegakkan maxKeys dengan evict entri tertua (by TTL)
 * alih-alih melempar `ECACHEFULL` (perilaku bawaan NodeCache saat penuh).
 *
 * @param {import('node-cache').NodeCache} cache
 * @returns {import('node-cache').NodeCache} cache yang sama (dimutasi)
 */
const withBoundedSet = (cache) => {
  const orig = cache.set.bind(cache);
  const max = cache.options.maxKeys;
  cache.set = (key, value, ttl) => {
    if (max > -1 && !cache.has(key) && cache.keys().length >= max) {
      let oldest = null;
      let oldestTtl = Infinity;
      for (const k of cache.keys()) {
        const t = cache.getTtl(k);
        if (t < oldestTtl) {
          oldestTtl = t;
          oldest = k;
        }
      }
      if (oldest) cache.del(oldest);
    }
    return orig(key, value, ttl);
  };
  return cache;
};

/**
 * Cache metadata grup (dipakai sebagai `cachedGroupMetadata` socket)
 * sekaligus daftar grup untuk fitur `.swgc all`.
 *
 * StdTTL 5 menit + maxKeys untuk mengikat memori terburuk: entri paling lama
 * di-evict saat cap tercapai (via `withBoundedSet`) agar metadata grup dari
 * banyak grup tidak menumpuk tanpa batas.
 */
export const groupCache = withBoundedSet(
  new NodeCache({
    stdTTL: 5 * 60,
    useClones: false,
    maxKeys: 1000,
  }),
);

/** Cache retry counter pesan (instance terpisah agar TTL tidak saling timpa). */
export const msgRetryCache = new NodeCache({ stdTTL: 60 * 60, useClones: false });