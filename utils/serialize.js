const fs = require("fs");

class App {
  constructor(sock) {
    this.sock = sock;
  }

  async messagewithDelay(fnMessage, time) {
    try {
      if (time && isNaN(time)) await delay(Number(time));
      return await fnMessage();
    } catch (error) {
      console.error(error);
    }
  }

  async readMessages(key) {
    if (!key) return;
    await this.sock.readMessages(key);
  }

  async sendText(jid, { text, mention = [], delay = null, key = null }) {
    try {
      let mentions = [];
      if (mention.length > 0) {
        mentions = mention.map(v => "@" + parseInt(v));
      }
      await this.readMessages(key);
      const fnMessage = this.sock.sendMessage(jid, { text, mentions });
      await this.messagewithDelay(delay, fnMessage);
    } catch (error) {
      console.error(error);
    }
  }

  async sendImage(jid, { text = "", file, delay = null, key = null }) {
    try {
      if (!file) throw new Error(`FILE TIDAK DITEMUKAN`);
      await this.readMessages(key);
      const fnMessage = this.sock.sendMessage(jid, {
        image: {
          url: file
        },
        caption
      });
      await this.messagewithDelay(fnMessage, delay);
    } catch (error) {
      console.error(error);
    }
  }

  async sendVideo(jid, { caption = "", file, delay = null, key = null }) {
    try {
      if (!jid || !file)
        throw new Error({
          status: "error",
          jid,
          file
        });
      await this.readMessages(key);
      const fnMessage = await this.sock.sendMessage(jid, {
        video: {
          url: file
        },
        caption
      });
      return await this.messagewithDelay(fnMessage, delay);
    } catch (error) {
      console.error(error);
    }
  }
}

module.exports = App;
