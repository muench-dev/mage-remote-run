import { listModulesAction } from './modules-actions.js';
import { addFormatOption } from '../utils.js';

export function registerModulesCommands(program) {
        const modules = program.command('module').description('Manage modules');

        addFormatOption(modules.command('list')
                .description('List all modules'))
                .addHelpText('after', `
Examples:
  $ mage-remote-run module list
  $ mage-remote-run module list --format json
`)
                .action(listModulesAction);
}
