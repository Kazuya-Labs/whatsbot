/**
 * Format tanggal lokal Indonesia.
 * @param {Date|string|number} date
 * @param {'short'|'medium'|'long'|'full'} [style='long']
 * @returns {string}
 */
export const formatDateId = (date, style = "long") => {
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new TypeError("Tanggal tidak valid");

  const options = {
    short: { day: "numeric", month: "numeric", year: "numeric" },
    medium: { day: "numeric", month: "short", year: "numeric" },
    long: { day: "numeric", month: "long", year: "numeric" },
    full: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  };

  return new Intl.DateTimeFormat("id-ID", options[style]).format(d);
};

/** Format waktu lokal 24 jam. @param {Date|string|number} date @param {boolean} [includeZone=true] @returns {string} */
export const formatTimeId = (date, includeZone = true) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new TypeError("Tanggal tidak valid");

  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...(includeZone && { timeZoneName: "short" }),
  };

  return new Intl.DateTimeFormat("id-ID", options).format(d);
};

/** Durasi milidetik -> "2 jam 15 menit 30 detik". @param {number} ms @returns {string} */
export const formatDuration = (ms) => {
  if (typeof ms !== "number" || ms < 0)
    throw new TypeError("Input harus berupa angka positif");

  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days} hari`);
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} menit`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} detik`);

  return parts.join(" ");
};

/**
 * Selisih waktu relatif ("3 jam yang lalu").
 * @param {Date|string|number} targetDate
 * @param {Date|string|number} [baseDate=new Date()]
 * @returns {string}
 */
export const timeAgo = (targetDate, baseDate = new Date()) => {
  const target = new Date(targetDate);
  const base = new Date(baseDate);
  if (isNaN(target.getTime()) || NaN(base.getTime()))
    throw new TypeError("Tanggal tidak valid");

  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = target.getTime() - base.getTime();
  const absElapsed = Math.abs(elapsed);

  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });

  if (absElapsed < msPerMinute) {
    return rtf.format(Math.round(elapsed / 1000), "second");
  } else if (absElapsed < msPerHour) {
    return rtf.format(Math.round(elapsed / msPerMinute), "minute");
  } else if (absElapsed < msPerDay) {
    return rtf.format(Math.round(elapsed / msPerHour), "hour");
  } else if (absElapsed < msPerMonth) {
    return rtf.format(Math.round(elapsed / msPerDay), "day");
  } else if (absElapsed < msPerYear) {
    return rtf.format(Math.round(elapsed / msPerMonth), "month");
  } else {
    return rtf.format(Math.round(elapsed / msPerYear), "year");
  }
};

/**
 * Tambah/kurang waktu dari tanggal.
 * @param {Date|string|number} date
 * @param {number} amount
 * @param {'days'|'hours'|'minutes'|'seconds'} unit
 * @returns {Date}
 */
export const addTimeToDate = (date, amount, unit) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) throw new TypeError("Tanggal tidak valid");

  switch (unit) {
    case "days":
      d.setDate(d.getDate() + amount);
      break;
    case "hours":
      d.setHours(d.getHours() + amount);
      break;
    case "minutes":
      d.setMinutes(d.getMinutes() + amount);
      break;
    case "seconds":
      d.setSeconds(d.getSeconds() + amount);
      break;
    default:
      throw new Error(`Unit '${unit}' tidak didukung`);
  }
  return d;
};
