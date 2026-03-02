import {
  confirmCustomerAction,
  createCustomerAction,
  deleteCustomerAction,
  editCustomerAction,
  listCustomerGroupsAction,
  listCustomersAction,
  searchCustomersAction,
  showCustomerAction
} from './customers-actions.js';

import {
  addPaginationOptions,
  addFormatOption,
  addFilterOption,
  addSortOption
} from '../utils.js';

export function registerCustomersCommands(program) {
  const customers = program.command('customer').description('Manage customers');

  addFormatOption(addSortOption(addFilterOption(addPaginationOptions(customers.command('list')
    .description('List customers')))))
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer list
  $ mage-remote-run customer list --page 2 --size 50
  $ mage-remote-run customer list --format json
  $ mage-remote-run customer list --filter "email=%@example.com%" --filter "group_id=1"
  $ mage-remote-run customer list --sort "firstname:ASC" --sort "created_at:DESC"
`)
    .action(listCustomersAction);

  customers.command('search <query>')
    .description('Search customers by email')
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer search "john@example.com"
`)
    .action(searchCustomersAction);

  customers.command('create')
    .description('Create a new customer')
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer create
`)
    .action(createCustomerAction);

  customers.command('edit <id>')
    .description('Edit a customer')
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer edit 123
`)
    .action(editCustomerAction);

  addFormatOption(customers.command('show <customerId>')
    .description('Show detailed customer information'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer show 123
  $ mage-remote-run customer show 123 --format json
`)
    .action(showCustomerAction);

  customers.command('delete <customerId>')
    .description('Delete a customer')
    .option('--force', 'Force delete without confirmation')
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer delete 123
  $ mage-remote-run customer delete 123 --force
`)
    .action(deleteCustomerAction);

  customers.command('confirm [customerId]')
    .description('Resend customer confirmation email')
    .option('--redirect-url <url>', 'Redirect URL after confirmation')
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer confirm 123
  $ mage-remote-run customer confirm 123 --redirect-url "https://example.com/login"
  $ mage-remote-run customer confirm
`)
    .action(confirmCustomerAction);

  const groups = customers.command('group').description('Manage customer groups');

  addSortOption(addFilterOption(addPaginationOptions(groups.command('list')
    .description('List customer groups'))))
    .addHelpText('after', `
Examples:
  $ mage-remote-run customer group list
  $ mage-remote-run customer group list --page 1 --size 50
  $ mage-remote-run customer group list --filter "code=%VIP%"
  $ mage-remote-run customer group list --sort "code:ASC"
`)
    .action(listCustomerGroupsAction);
}
