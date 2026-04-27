const execute = async ({m}) => {
  try {
    console.log('Ini adalah m')
    m.reply(`Hai Ini adalah unit testing... `);
  } catch (e) {
    console.error(e);
  }
};

module.exports = {
  names: ["tes"],
  execute,
};
