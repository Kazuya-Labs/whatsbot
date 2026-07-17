import { Handler } from "./index.js";

const loadPlugins = (names, execute, opts = {}) => {
  try {
    const options = {
      tag: opts.tag || "user",
      owner: opts.owner || false,
      isAdmin: opts.isAdmin || false,
      isGroup: opts.isGroup || false,
    };

    const pluginData = { execute, options };

    if (Array.isArray(names)) {
      const len = names.length;
      for (let i = 0; i < len; i++) {
        Handler.list.set(names[i], pluginData);
      }
    } else if (names) {
      Handler.list.set(names, pluginData);
    }
  } catch (e) {
    console.error("Error loading plugin:", e);
  }
};

export {loadPlugins}