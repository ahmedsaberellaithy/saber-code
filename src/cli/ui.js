/**
 * CLI UI: spinner, diff display, prompts.
 */

const chalk = require('chalk');
const inquirer = require('inquirer');

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const SPINNER_INTERVAL = 80;

class Spinner {
  constructor(text = '') {
    this.text = text;
    this._i = 0;
    this._tid = null;
    this._stopped = false;
  }

  start() {
    this._stopped = false;
    this._tid = setInterval(() => {
      if (this._stopped) return;
      const frame = SPINNER_FRAMES[this._i % SPINNER_FRAMES.length];
      this._i++;
      process.stdout.write(`\r ${chalk.cyan(frame)} ${this.text}`);
    }, SPINNER_INTERVAL);
    return this;
  }

  stop() {
    this._stopped = true;
    if (this._tid) {
      clearInterval(this._tid);
      this._tid = null;
    }
    process.stdout.write('\r' + ' '.repeat(3 + this.text.length) + '\r');
    return this;
  }

  succeed(msg) {
    this.stop();
    console.log(chalk.green(' ✓') + (msg ? ` ${msg}` : ''));
    return this;
  }

  fail(msg) {
    this.stop();
    console.log(chalk.red(' ✗') + (msg ? ` ${msg}` : ''));
    return this;
  }

  updateText(text) {
    this.text = text;
    return this;
  }
}

function createSpinner(text) {
  return new Spinner(text);
}

/**
 * Simple line-based diff: oldText vs newText. Returns formatted string.
 * Uses common prefix/suffix; middle shown as - / + lines.
 */
function formatDiff(oldText, newText) {
  const oldLines = (oldText || '').split(/\r?\n/);
  const newLines = (newText || '').split(/\r?\n/);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) {
    suffix++;
  }
  const out = [];
  for (let i = 0; i < prefix; i++) out.push('  ' + oldLines[i]);
  const oldMid = oldLines.slice(prefix, oldLines.length - (suffix || undefined));
  const newMid = newLines.slice(prefix, newLines.length - (suffix || undefined));
  for (const l of oldMid) out.push(chalk.red('- ' + l));
  for (const l of newMid) out.push(chalk.green('+ ' + l));
  for (let i = oldLines.length - suffix; i < oldLines.length; i++) out.push('  ' + oldLines[i]);
  return out.join('\n');
}

/**
 * Prompts
 */
async function promptInput(message, defaultAnswer = '') {
  const { value } = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultAnswer
    }
  ]);
  return value;
}

async function promptConfirm(message, defaultAnswer = true) {
  const { value } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'value',
      message,
      default: defaultAnswer
    }
  ]);
  return value;
}

async function promptList(message, choices, defaultIndex = 0) {
  const { value } = await inquirer.prompt([
    {
      type: 'list',
      name: 'value',
      message,
      choices,
      default: defaultIndex
    }
  ]);
  return value;
}

module.exports = {
  Spinner,
  createSpinner,
  formatDiff,
  promptInput,
  promptConfirm,
  promptList,
  chalk
};
