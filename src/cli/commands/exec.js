/**
 * Exec command: load plan and execute.
 */

const { Config, Agent, PlanManager } = require('../../core');
const { createSpinner, chalk } = require('../ui');

async function runExec(options = {}) {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();

  const agent = new Agent(config);
  const planManager = new PlanManager(config, agent);

  const plan = await planManager.load();
  if (!plan || !plan.steps || !plan.steps.length) {
    console.error(chalk.red('No plan found. Create one with: saber-code plan <goal>\n'));
    process.exitCode = 1;
    return;
  }

  console.log(chalk.blue.bold('Executing plan: ') + (plan.goal || '') + '\n');

  const spinner = createSpinner('Running steps...').start();
  try {
    const result = await planManager.execute(plan, { continueOnError: !!options.continueOnError });
    spinner.stop();

    const ok = result.results.filter((r) => r.ok).length;
    const fail = result.results.filter((r) => !r.ok);

    console.log(chalk.green('Completed: ' + ok + ' / ' + result.results.length) + ' steps.\n');

    if (fail.length) {
      console.log(chalk.red('Failed steps:'));
      fail.forEach((f) => console.log('  ' + (f.index + 1) + '. ' + f.tool + ': ' + f.error));
      console.log('');
      if (result.failedAt != null) process.exitCode = 1;
    }
  } catch (e) {
    spinner.fail(e.message);
    process.exitCode = 1;
  }
}

module.exports = { runExec };
