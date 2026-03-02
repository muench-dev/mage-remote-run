import { listAttributeSetsAction, showAttributeSetAction } from './eav-actions.js';

import {
  addPaginationOptions,
  addFormatOption,
  addFilterOption,
  addSortOption
} from '../utils.js';

export function registerEavCommands(program) {
  const eav = program.command('eav').description('Manage EAV attributes and sets');
  const attributeSets = eav.command('attribute-set').description('Manage attribute sets');

  addFormatOption(addSortOption(addFilterOption(addPaginationOptions(attributeSets.command('list')
    .description('List all attribute sets')))))
    .addHelpText('after', `
Examples:
  $ mage-remote-run eav attribute-set list
  $ mage-remote-run eav attribute-set list --page 1 --size 50
  $ mage-remote-run eav attribute-set list --filter "attribute_set_name=%Default%"
  $ mage-remote-run eav attribute-set list --sort "sort_order:ASC"
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
