const fs = require("fs").promises;
const path = require("path");

const Handler = {};
Handler.list = {};

Handler.loadPlugin = async (names, execute, opts) => {
  try {
    const {
      tag = "all",
      owner = false,
      isAdmin = true,
      isGroup = false
    } = opts;

    if (!Array.isArray(names)) {
      handler[names] = {
        execute,
        options: {
          owner,
          isAdmin,
          isGroup
        }
      };
    }
  } catch (e) {
    console.error(e);
  }
};

Handler.register = async file => {
  try {
    const files = await fs.readdir(file);
    await promises.all(async file => {
      const fullPath = path.join(directory, file);
      const stats = await fs.stat(fullPath);
      if (stats.isDirectory() && file !== "utils") {
        await Handler.register(fullPath);
      }
      if (file.endsWith(".js")) {
        try {
          const { names, execute, ...opts } = require(file);
          await Handler.loadPlugin(data);
        } catch (error) {
          console.error(error);
        }
      }
    });
  } catch (e) {
    console.error(e);
  }
};

Handler.executeFn = async (command, opts) => {
  try {
    if (!command && !Handler.list[command]) return;
    await Handler.list[command].execute(command, opts);
  } catch (e) {
    console.error(e);
  }
};

module.exports = Handler;
