const { Boom } = require("@hapi/boom");
const handleConnection = async (update, fnStart) => {
  try {
    const { connection, lastDisconnect } = update;
    if (connection == "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        if (shouldReconnect) {
          startSock();
        }
      }
    } else if (connection === "open") {
      console.log("koneksi terbuka ...");
    }
  } catch (e) {
    console.error(e);
  }
};

module.exports = handleConnection;
