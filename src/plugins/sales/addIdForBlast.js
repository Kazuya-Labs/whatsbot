import path from "node:path";
import { readJsonFile, writeJsonFile } from "../../utils/fileHelper.js";

const dirpath = path.join(process.cwd(), "src", "storage", "autoblast.json");

const execute = async ({ m }) => {
  try {
    let id = null;
    id = m.text;
    if (!id) {
      id = m.chat;
    }
    const rawData = readJsonFile(dirpath);
    const newData = new Set([rawData.campaigns.targets]).add(id);
    writeJsonFile(dirpath, newData);
    m.reply("succes add id ");
  } catch (error) {}
};

export default {
  names: ["addid"],
  execute,
  owner: true,
};
