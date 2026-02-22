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
        .addHelpText('after', `
Examples:
  $ mage-remote-run order list
  $ mage-remote-run order list --page 1 --size 10
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
