/**
 * List plans command: show all available plans.
 */

const { Config, PlanManager } = require('../../core');
const { chalk } = require('../ui');
const path = require('path');

async function runListPlans() {
  const rootPath = process.cwd();
  const config = new Config(rootPath);
  await config.load();

  const planManager = new PlanManager(config);

  const plans = await planManager.listPlans();
  if (plans.length === 0) {
    console.log(chalk.yellow('No plans found in _saber_code_plans/. Create one with: saber-code plan <goal>\n'));
    return;
  }

  console.log(chalk.blue.bold('Available plans in _saber_code_plans/:\n'));
  for (const planPath of plans) {
    try {
      const { plan } = await planManager.load(planPath);
      const filename = path.basename(planPath);
      const goal = plan?.goal || '(no goal)';
      const steps = plan?.steps?.length || 0;
      const createdAt = plan?.createdAt || '';
      const date = createdAt ? new Date(createdAt).toLocaleString() : '';
      console.log(chalk.green(filename));
      console.log('  Goal: ' + goal);
      console.log('  Steps: ' + steps);
      if (date) console.log('  Created: ' + date);
      console.log('  Path: ' + planPath);
      console.log('');
    } catch (e) {
      console.log(chalk.red(path.basename(planPath) + ' (error loading)'));
    }
  }
}

module.exports = { runListPlans };
