import { listTaxClassesAction, showTaxClassAction } from './tax-actions.js';

import { addPaginationOptions } from '../utils.js';

export function registerTaxCommands(program) {
        const tax = program.command('tax').description('Manage tax classes');
        const taxClass = tax.command('class').description('Manage tax classes');

        addPaginationOptions(taxClass.command('list')
                .description('List tax classes'))
                .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
                .addHelpText('after', `
Examples:
  $ mage-remote-run tax class list
  $ mage-remote-run tax class list --page 1 --size 50
`)
                .action(listTaxClassesAction);

        taxClass.command('show <id>')
                .description('Show tax class details')
                .addHelpText('after', `
Examples:
  $ mage-remote-run tax class show 3
`)
                .action(showTaxClassAction);
}
