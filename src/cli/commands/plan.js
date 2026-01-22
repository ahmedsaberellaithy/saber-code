/**
 * Plan command: batch context, build plan, save.
 */

const { Config, Agent, PlanManager } = require('../../core');
const { createSpinner, chalk, promptConfirm } = require('../ui');
const { glob } = require('glob');
const { FileUtils } = require('../../utils/fileUtils');

const DEFAULT_IGNORE = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/coverage/**'];

async function loadFilesIntoAgent(agent, patterns, rootPath, maxFiles = 20) {
  const fileUtils = new FileUtils(rootPath);
  const all = new Set();
  for (const p of patterns) {
    const files = await glob(p, { cwd: rootPath, ignore: DEFAULT_IGNORE, nodir: true });
    files.forEach((f) => all.add(f));
  }
  const list = [...all].slice(0, maxFiles);
  for (const f of list) {
    try {
      const content = await fileUtils.readFile(f);
      agent.addFile(f, content);
    } catch (_) {}
  }
  return list.length;
}

async function runPlan(goal, options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();
  if (options.model) config.override({ ollama: { defaultModel: options.model } });

  const agent = new Agent(config);
  const planManager = new PlanManager(config, agent);

  const patterns = options.load ? (Array.isArray(options.load) ? options.load : [options.load]) : [];
  if (patterns.length) {
    const spinner = createSpinner('Loading context...').start();
    const n = await loadFilesIntoAgent(agent, patterns, rootPath, config.limits?.maxFilesInContext ?? 20);
    spinner.succeed('Loaded ' + n + ' file(s) into context.');
  }

  const spinner = createSpinner('Creating plan...').start();
  try {
    const { plan, planPath, filename } = await planManager.create(goal, { model: options.model });
    spinner.stop();

    // Show plan preview
    console.log(chalk.blue.bold('\n📋 Plan Preview:'));
    console.log(chalk.blue.bold('Goal: ') + (plan.goal || goal));
    console.log(chalk.gray('Steps: ' + (plan.steps || []).length));
    console.log(chalk.gray('Filename: ' + filename));
    console.log(chalk.gray('Path: ' + planPath + '\n'));

    if (plan.steps && plan.steps.length) {
      console.log(chalk.yellow('Steps:'));
      plan.steps.forEach((s, i) => {
        const argsPreview = JSON.stringify(s.args || {}).substring(0, 80);
        console.log('  ' + chalk.cyan((i + 1) + '.') + ' ' + chalk.green(s.tool || '?') + ' ' + chalk.gray(argsPreview + (argsPreview.length >= 80 ? '...' : '')));
      });
      console.log('');
    }

    // Show full plan JSON
    console.log(chalk.gray('Full plan JSON:'));
    console.log(chalk.gray('─'.repeat(60)));
    console.log(JSON.stringify(plan, null, 2));
    console.log(chalk.gray('─'.repeat(60) + '\n'));

    // Ask to save
    const shouldSave = options.yes || (await promptConfirm('Save this plan?', true));
    if (shouldSave) {
      await planManager.savePlan(plan, planPath);
      console.log(chalk.green('✅ Plan saved to: ' + planPath + '\n'));
    } else {
      console.log(chalk.yellow('Plan not saved.\n'));
      return { plan, planPath: null };
    }

    if (options.execute && (options.yes || (await promptConfirm('Execute this plan now?', false)))) {
      const execSpinner = createSpinner('Executing plan...').start();
      const result = await planManager.execute(plan, { continueOnError: !!options.continueOnError });
      execSpinner.stop();
      const failed = result.results.filter((r) => !r.ok);
      if (failed.length) {
        console.log(chalk.red('Some steps failed:'));
        failed.forEach((f) => console.log('  ' + f.tool + ': ' + f.error));
      } else {
        console.log(chalk.green('Plan executed successfully.'));
      }
      console.log('');
    }

    return { plan, planPath };
  } catch (e) {
    spinner.fail(e.message);
    throw e;
  }
}

module.exports = { runPlan, loadFilesIntoAgent };
