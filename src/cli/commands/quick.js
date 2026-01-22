/**
 * Quick commands: search, analyze, models.
 */

const { Config, Agent, OllamaClient } = require('../../core');
const { createSpinner, chalk } = require('../ui');
const { createRegistry } = require('../../tools');
const { FileUtils } = require('../../utils/fileUtils');

async function runSearch(term, options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();

  const registry = createRegistry();
  const fileUtils = new FileUtils(rootPath);
  const ctx = { rootPath, fileUtils, config };

  const spinner = createSpinner('Searching...').start();
  try {
    const result = await registry.run('search', ctx, {
      pattern: term,
      glob: options.glob || '**/*',
      maxResults: options.maxResults || 50
    });
    spinner.stop();

    console.log(chalk.blue.bold('Search: ') + term);
    console.log(chalk.gray('Matches: ' + (result.total || 0) + '\n'));

    const matches = result.matches || [];
    for (const m of matches.slice(0, options.limit || 30)) {
      console.log(chalk.cyan(m.path) + ':' + m.lineNumber);
      console.log('  ' + (m.line || '').trim());
      console.log('');
    }
  } catch (e) {
    spinner.fail(e.message);
    throw e;
  }
}

async function runAnalyze(filePath, options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();
  if (options.model) config.override({ ollama: { defaultModel: options.model } });

  const agent = new Agent(config);
  const fileUtils = new FileUtils(rootPath);

  let content;
  try {
    content = await fileUtils.readFile(filePath);
  } catch (e) {
    console.error(chalk.red('Cannot read file: ' + filePath + '\n'));
    throw e;
  }

  agent.addFile(filePath, content);

  const prompt =
    'Analyze this file. Describe its purpose, structure, key functions or exports, and any notable patterns or issues. Be concise.\n\nFile: ' +
    filePath;

  const spinner = createSpinner('Analyzing...').start();
  try {
    const res = await agent.chat(prompt, { stream: false, model: options.model });
    spinner.stop();
    console.log(chalk.blue.bold('Analysis: ') + filePath + '\n');
    console.log((res.content || '').trim() + '\n');
  } catch (e) {
    spinner.fail(e.message);
    throw e;
  }
}

async function runModels() {
  const config = new Config(process.cwd());
  await config.load();
  const client = new OllamaClient(config);

  try {
    const models = await client.listModels();
    console.log(chalk.blue.bold('Ollama models:\n'));
    (models || []).forEach((m) => {
      console.log('  ' + chalk.green(m.name) + (m.size ? chalk.gray(' (' + m.size + ')') : ''));
    });
    console.log('');
  } catch (e) {
    console.error(chalk.red(e.message + '\n'));
    throw e;
  }
}

module.exports = { runSearch, runAnalyze, runModels };
