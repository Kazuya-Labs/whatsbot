import chalk from "chalk";

class Logs {
  error(...args) {
    console.error(chalk.red("[ ERROR ] "), ...args);
  }
  debug(...args) {
    console.debug(chalk.gray("[ DEBUG ]"), ...args);
  }
  warn(...args) {
    console.warn(chalk.yellow("[ WARN ] "), ...args);
  }
  success(...args) {
    console.log(chalk.yellow("[ SUCCESS ] "), ...args);
  }
  info(...args) {
    console.info(chalk.blue("[ INFO ] "), ...args);
  }
}

export default new Logs()