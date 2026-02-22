import { listModulesAction } from './modules-actions.js';

export function registerModulesCommands(program) {
    const modules = program.command('module').description('Manage modules');

    modules.command('list')
        .description('List all modules')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run module list
  $ mage-remote-run module list --format json
`)
        .action(listModulesAction);
}
