import { listCartsAction, showCartAction } from './cart-actions.js';

import {
  addPaginationOptions,
  addFormatOption,
  addFilterOption,
  addSortOption
} from '../utils.js';

export function registerCartCommands(program) {
  const carts = program.command('cart').description('Manage carts');

  addFormatOption(carts.command('show <cartId>')
    .description('Show detailed cart information'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run cart show 123
  $ mage-remote-run cart show 123 --format json
`)
    .action(showCartAction);

  addFormatOption(addSortOption(addFilterOption(addPaginationOptions(carts.command('list')
    .description('List carts')))))
    .addHelpText('after', `
Examples:
  $ mage-remote-run cart list
  $ mage-remote-run cart list --page 2 --size 50
  $ mage-remote-run cart list --filter "is_active=1"
  $ mage-remote-run cart list --sort "created_at:DESC"
`)
    .action(listCartsAction);
}
