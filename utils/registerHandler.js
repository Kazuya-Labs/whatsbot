const fs = require("fs").promises;
const path = require("path");

const Handler = {};
Handler.list = {};

Handler.loadPlugin = async (names, execute, opts = {}) => {
  try {
    const {
      tag = "all",
      owner = false,
      isAdmin = true,
      isGroup = false
    } = opts;

    if (!Array.isArray(names)) {
      Handler.list[names] = {
        execute,
        options: { owner, isAdmin, isGroup, tag }
      };
    } else {
      names.forEach(name => {
        Handler.list[name] = {
          execute,
          options: { owner, isAdmin, isGroup, tag }
        };
      });
    }
  } catch (e) {
    console.error("Error loading plugin:", e);
  }
};

Handler.register = async directory => {
  try {
    const files = await fs.readdir(directory);
    await Promise.all(
      files.map(async file => {
        const fullPath = path.join(directory, file);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory() && file !== "utils") {
          await Handler.register(fullPath);
        } else if (file.endsWith(".js")) {
          try {
            const { names, execute, ...opts } = require(fullPath);
            await Handler.loadPlugin(names, execute, opts);
          } catch (error) {
            console.error("Error requiring file:", fullPath, error);
          }
        }
      })
    );
  } catch (e) {
    console.error("Error registering plugins:", e);
  }
};

Handler.executeFn = async (command, opts) => {
  try {
    if (!command || !Handler.list[command]) return;
    await Handler.list[command].execute(command, opts);
  } catch (e) {
    console.error("Error executing command:", e);
  }
};

module.exports = Handler;