import logs from "../../utils/logs.js";

const execute = async ({ m, sock }) => {
  try {
    const groups = await sock.groupFetchAllParticipating();
    const listId = Object.keys(groups);
    const group = listId.map((id) => {
      return {
        name: groups[id].subject,
        id: groups[id].id,
        memberCount: groups[id].size - 1,
      };
    });

    let msg = "";
    for (const data of group) {
      msg += `id : ${data.id}\nname : ${data.name}\nmember : ${data.memberCount}`;
    }
    m.reply(msg);
  } catch (error) {
    logs.error(error);
  }
};

export default {
  execute,
  names: ["cekidgc", "cekid"],
  owner: true,
};
