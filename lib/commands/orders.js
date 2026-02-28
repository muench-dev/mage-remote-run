import {
  cancelOrderAction,
  editOrderAction,
  holdOrderAction,
  latestOrdersAction,
  listOrdersAction,
  searchOrdersAction,
  showOrderAction,
  unholdOrderAction
} from './orders-actions.js';

export function registerOrdersCommands(program) {
  const orders = program.command('order').description('Manage orders');

  orders.command('list')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-s, --size <number>', 'Page size', '20')
    .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
    .option('--status <status>', 'Filter by order status')
    .option('--email <email>', 'Filter by customer email')
    .option('--store <store_id>', 'Filter by store ID')
    .option('--date-from <date>', 'Filter by creation date from (e.g. 2023-01-01)')
    .option('--date-to <date>', 'Filter by creation date to (e.g. 2023-12-31)')
    .option('--filter <filters...>', 'Generic filters (e.g. status=pending)')
    .option('--fields <fields>', 'Comma-separated columns to display exclusively (overrides default fields)')
    .option('--add-fields <fields>', 'Comma-separated columns to add alongside default fields')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order list
  $ mage-remote-run order list --page 1 --size 10
  $ mage-remote-run order list --status pending
  $ mage-remote-run order list --email user@example.com
  $ mage-remote-run order list --date-from 2023-01-01 --date-to 2023-12-31
  $ mage-remote-run order list --fields "increment_id,grand_total,customer_email"
  $ mage-remote-run order list --filter "grand_total>=100" --add-fields "base_grand_total,billing_address.city"
  $ mage-remote-run order list --format json
`)
    .action(listOrdersAction);

  orders.command('search <query>')
    .description('Search orders by Increment ID')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order search 000000001
`)
    .action(searchOrdersAction);

  orders.command('edit <id>')
    .description('Update order status (via Comment)')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order edit 123
`)
    .action(editOrderAction);

  orders.command('cancel <id>')
    .description('Cancel an order')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order cancel 123
`)
    .action(cancelOrderAction);

  orders.command('hold <id>')
    .description('Hold an order')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order hold 123
`)
    .action(holdOrderAction);

  orders.command('unhold <id>')
    .description('Unhold an order')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order unhold 123
`)
    .action(unholdOrderAction);

  orders.command('show <identifier>')
    .description('Show detailed order information by ID or Increment ID')
    .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order show 123
  $ mage-remote-run order show 000000001
`)
    .action(showOrderAction);

  orders.command('latest')
    .description('List latest orders sorted by created_at DESC with selection')
    .option('-p, --page <number>', 'Page number', '1')
    .option('-z, --size <number>', 'Page size', '20')
    .option('-s, --select', 'Interactive selection mode')
    .addHelpText('after', `
Examples:
  $ mage-remote-run order latest
  $ mage-remote-run order latest --size 5 --select
`)
    .action(latestOrdersAction);
}
