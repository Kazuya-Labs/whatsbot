import fs from "fs";

const readJson = (file) => {
  try {
    if (!file) throw new Error("Argumen 'file' dibutuhkan");
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Gagal membaca file JSON:", error.message);
    return null;
  }
};
/**
 *
 * @param {string} file - filepath atau format file
 * @param {object} newData - data yang mau ditulis
 * @returns {object}
 */
const writeJson = (file, newData) => {
  try {
    if (!file || typeof newData === "undefined") {
      throw new Error("Argumen 'file' dan 'newData' dibutuhkan");
    }
    const jsonString = JSON.stringify(newData, null, 2); // pretty print
    fs.writeFileSync(file, jsonString, "utf-8");
    return readJson(file);
  } catch (error) {
    console.error("Gagal menulis file JSON:", error.message);
  }
};

/**
 *
 * @param {Object} msg - m dari text
 */

const getFlag = (msg) => msg.text.split("").slice(0).join(" ");

export { writeJson, readJson, getFlag };
