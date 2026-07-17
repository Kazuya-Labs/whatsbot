/**
 * 1. Memformat angka menjadi format mata uang Rupiah (IDR).
 * @param {number} amount - Angka yang akan diformat.
 * @returns {string} Teks terformat (Contoh: "Rp 150.000").
 */
export const formatRupiah = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * 2. Memformat nomor telepon internasional/lokal menjadi standar bersih (hanya angka).
 * Mengubah awalan "08" atau "+62" menjadi format standar tertentu (default: "628").
 * @param {string} phone - Nomor telepon mentah.
 * @returns {string} Nomor telepon bersih tanpa spasi/simbol.
 */
export const sanitizePhoneNumber = (phone) => {
  let cleaned = phone.replace(/\D/g, ''); // Hapus semua karakter non-angka
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
};

/**
 * 3. Mengubah objek menjadi string query URL (Serialization).
 * @param {Object} obj - Objek key-value.
 * @returns {string} String query URL (Contoh: "page=1&limit=10").
 */
export const serializeQuery = (obj) => {
  return new URLSearchParams(obj).toString();
};

/**
 * 4. Membuat string acak (Random String) untuk kebutuhan token, password acak, atau ID unik.
 * @param {number} [length=16] - Panjang karakter yang diinginkan.
 * @returns {string} String acak alfanumerik.
 */
export const generateRandomString = (length = 16) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 5. Memotong teks yang terlalu panjang dan menambahkan tanda akhiran (Truncate).
 * @param {string} text - Teks asli.
 * @param {number} maxLength - Batas maksimal karakter.
 * @param {string} [suffix='...'] - Tanda akhiran potong.
 * @returns {string} Teks yang sudah dipotong.
 */
export const truncateText = (text, maxLength, suffix = '...') => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + suffix;
};

/**
 * 6. Mengubah string menjadi format Slug (Cocok untuk URL SEO friendly).
 * @param {string} text - Teks asli (Contoh: "Belajar Node.js untuk Pemula!").
 * @returns {string} String berbentuk slug (Contoh: "belajar-node-js-untuk-pemula").
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Ganti spasi dengan -
    .replace(/[^\w\-]+/g, '')       // Hapus semua karakter non-word
    .replace(/\-\-+/g, '-');        // Ganti gundukan tanda - menjadi satu
};

/**
 * 7. Mengecek apakah sebuah objek kosong (Empty Object {}).
 * @param {Object} obj - Objek yang ingin dicek.
 * @returns {boolean} True jika kosong, False jika memiliki properti.
 */
export const isEmptyObject = (obj) => {
  return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * 8. Menyaring (filter) objek hanya untuk mengambil properti yang diinginkan saja (Pick Object).
 * @param {Object} obj - Objek sumber.
 * @param {string[]} keys - Daftar key yang ingin diambil.
 * @returns {Object} Objek baru berisi key yang dipilih saja.
 */
export const pickFields = (obj, keys) => {
  const newObj = {};
  keys.forEach((key) => {
    if (key in obj) newObj[key] = obj[key];
  });
  return newObj;
};

/**
 * 9. Fungsi Debounce untuk membatasi eksekusi fungsi yang dipanggil berulang kali dalam waktu singkat.
 * Sangat berguna untuk mengoptimalkan performa pencarian (search input) atau resize window.
 * @param {Function} func - Fungsi yang akan dieksekusi.
 * @param {number} delay - Waktu tunggu dalam milidetik.
 * @returns {Function} Fungsi bernaung debounce.
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * 10. Menyembunyikan sebagian karakter sensitif (Masking), seperti email atau nomor kartu kredit.
 * @param {string} str - Teks sensitif.
 * @param {number} [visibleCount=4] - Jumlah karakter di awal/akhir yang tetap terlihat.
 * @returns {string} Teks ter-masking (Contoh: "user****@gmail.com" atau "4321************").
 */
export const maskSensitiveData = (str, visibleCount = 4) => {
  if (!str) return '';
  if (str.includes('@')) {
    // Masking tipe Email
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name[0]}***@${domain}`;
    return `${name.substring(0, visibleCount)}***@${domain}`;
  } else {
    // Masking tipe String Biasa / Nomor Kartu / Telepon
    if (str.length <= visibleCount) return '***';
    return str.substring(0, visibleCount) + '*'.repeat(str.length - visibleCount);
  }
};
