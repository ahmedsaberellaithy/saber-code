const chalk = require('chalk');

class Logger {
  static _verbose = process.env.DEBUG === '1' || process.env.VERBOSE === '1';

  static setVerbose(enabled) {
    this._verbose = enabled;
  }

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
    if (this._verbose) {
      console.log(chalk.gray(`🐛 ${message}`));
    }
  }

  static verbose(message) {
    if (this._verbose) {
      console.log(chalk.gray(`📝 ${message}`));
    }
  }

  static chat(user, message) {
    if (user === 'user') {
      console.log(chalk.green(`💬 You: ${message}`));
    } else {
      console.log(chalk.blue(`🤖 Assistant: ${message}`));
    }
  }

  static time(label) {
    if (this._verbose) {
      console.time(chalk.gray(`⏱️  ${label}`));
    }
  }

  static timeEnd(label) {
    if (this._verbose) {
      console.timeEnd(chalk.gray(`⏱️  ${label}`));
    }
  }

  static apiRequest(method, url, data) {
    if (this._verbose) {
      console.log(chalk.cyan('\n📤 API Request:'));
      console.log(chalk.gray(`  ${method} ${url}`));
      if (data) {
        const preview = typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data, null, 2).substring(0, 500);
        console.log(chalk.gray(`  Body: ${preview}${preview.length >= 200 ? '...' : ''}`));
      }
    }
  }

  static apiResponse(status, data, duration) {
    if (this._verbose) {
      console.log(chalk.cyan('\n📥 API Response:'));
      console.log(chalk.gray(`  Status: ${status}`));
      if (duration) {
        console.log(chalk.gray(`  Duration: ${duration.toFixed(2)}ms`));
      }
      if (data) {
        const preview = typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data, null, 2).substring(0, 500);
        console.log(chalk.gray(`  Data: ${preview}${preview.length >= 200 ? '...' : ''}`));
      }
    }
  }

  static prompt(messages, tokenCount) {
    if (this._verbose) {
      console.log(chalk.magenta('\n💭 Prompt to Model:'));
      console.log(chalk.gray(`  Messages: ${messages.length}`));
      if (tokenCount) {
        console.log(chalk.gray(`  Estimated tokens: ${tokenCount}`));
      }
      messages.forEach((msg, i) => {
        const role = msg.role.toUpperCase();
        const preview = msg.content.substring(0, 150);
        console.log(chalk.gray(`  [${i + 1}] ${role}: ${preview}${msg.content.length > 150 ? '...' : ''}`));
      });
    }
  }

  static context(size, files, messages) {
    if (this._verbose) {
      console.log(chalk.yellow('\n📚 Context:'));
      console.log(chalk.gray(`  Files: ${files || 0}`));
      console.log(chalk.gray(`  Messages: ${messages || 0}`));
      if (size) {
        console.log(chalk.gray(`  Size: ${size} tokens`));
      }
    }
  }
}

module.exports = Logger;
