import { listAttributeSetsAction, showAttributeSetAction } from './eav-actions.js';

import { addPaginationOptions, addFormatOption } from '../utils.js';

export function registerEavCommands(program) {
  const eav = program.command('eav').description('Manage EAV attributes and sets');
  const attributeSets = eav.command('attribute-set').description('Manage attribute sets');

  addFormatOption(addPaginationOptions(attributeSets.command('list')
    .description('List all attribute sets')))
    .addHelpText('after', `
Examples:
  $ mage-remote-run eav attribute-set list
  $ mage-remote-run eav attribute-set list --page 1 --size 50
`)
    .action(listAttributeSetsAction);

  addFormatOption(attributeSets.command('show <id>')
    .description('Show attribute set details'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run eav attribute-set show 4
`)
    .action(showAttributeSetAction);
}
