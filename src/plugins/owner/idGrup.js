import { createPlugin } from "#utils/plugin.js";

export default createPlugin({
  names: ["cekidgc", "cekid"],
  description: "Daftar ID grup bot",
  run: async ({ m, sock }) => {
    const groups = await sock.groupFetchAllParticipating();

    let msg = "";
    for (const data of Object.values(groups)) {
      msg += `id : ${data.id}\nname : ${data.subject}\nmember : ${data.size - 1}\n`;
    }
    m.reply(msg || "Belum ada grup.");
  },
});