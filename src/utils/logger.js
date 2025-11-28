const chalk = require('chalk');

class Logger {
  static info(message) {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  static success(message) {
    console.log(chalk.green(`✅ ${message}`));
  }

  static warning(message) {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  static error(message) {
    console.log(chalk.red(`❌ ${message}`));
  }

  static debug(message) {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`🐛 ${message}`));
    }
  }

  static chat(user, message) {
    if (user === 'user') {
      console.log(chalk.green(`💬 You: ${message}`));
    } else {
      console.log(chalk.blue(`🤖 Assistant: ${message}`));
    }
  }
}

module.exports = Logger;