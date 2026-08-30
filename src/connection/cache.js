import NodeCache from "node-cache";

/**
 * Cache metadata grup (dipakai sebagai `cachedGroupMetadata` socket)
 * sekaligus daftar grup untuk fitur `.swgc all`.
 */
export const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

/** Cache retry counter pesan (instance terpisah agar TTL tidak saling timpa). */
export const msgRetryCache = new NodeCache({ stdTTL: 60 * 60, useClones: false });