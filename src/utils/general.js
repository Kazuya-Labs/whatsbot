/** Format angka mata uang Rupiah (IDR). @param {number} amount @returns {string} */
export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Normalisasi nomor telepon: buang non-digit, "08x" jadi "628x".
 * @param {string} phone
 * @returns {string}
 */
export const sanitizePhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

/** @param {Object} obj @returns {string} query string URL */
export const serializeQuery = (obj) => {
  return new URLSearchParams(obj).toString();
};

/** String acak alfanumerik. @param {number} [length=16] @returns {string} */
export const generateRandomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Potong teks panjang + suffix.
 * @param {string} text
 * @param {number} maxLength
 * @param {string} [suffix='...']
 * @returns {string}
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + suffix;
};

/** Slug URL SEO friendly. @param {string} text @returns {string} */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
};

/** @param {Object} obj @returns {boolean} true jika objek kosong */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/** Ambil subset properti objek. @param {Object} obj @param {string[]} keys @returns {Object} */
export const pickFields = (obj, keys) => {
  const newObj = {};
  keys.forEach((key) => {
    if (key in obj) newObj[key] = obj[key];
  });
  return newObj;
};

/** Batasi eksekusi fungsi yang dipanggil berulang dalam waktu singkat. @param {Function} func @param {number} delay @returns {Function} */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/** Sembunyikan sebagian karakter sensitif. @param {string} str @param {number} [visibleCount=4] @returns {string} */
export const maskSensitiveData = (str, visibleCount = 4) => {
  if (!str) return '';
  if (str.includes('@')) {
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.substring(0, visibleCount)}***@${domain}`;
  } else {
    if (str.length <= visibleCount) return '***';
    return str.substring(0, visibleCount) + '*'.repeat(str.length - visibleCount);
  }
};
