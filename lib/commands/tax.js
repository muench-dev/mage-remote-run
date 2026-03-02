import { listTaxClassesAction, showTaxClassAction } from './tax-actions.js';

import {
  addPaginationOptions,
  addFormatOption,
  addFilterOption,
  addSortOption
} from '../utils.js';

export function registerTaxCommands(program) {
  const tax = program.command('tax').description('Manage tax classes');
  const taxClass = tax.command('class').description('Manage tax classes');

  addFormatOption(addSortOption(addFilterOption(addPaginationOptions(taxClass.command('list')
    .description('List tax classes')))))
    .addHelpText('after', `
Examples:
  $ mage-remote-run tax class list
  $ mage-remote-run tax class list --page 1 --size 50
  $ mage-remote-run tax class list --filter "class_type=CUSTOMER"
  $ mage-remote-run tax class list --sort "class_name:ASC"
`)
    .action(listTaxClassesAction);

  addFormatOption(taxClass.command('show <id>')
    .description('Show tax class details'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run tax class show 3
`)
    .action(showTaxClassAction);
}
