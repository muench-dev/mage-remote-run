import { listCartsAction, showCartAction } from './cart-actions.js';

export function registerCartCommands(program) {
    const carts = program.command('cart').description('Manage carts');

    carts.command('show <cartId>')
        .description('Show detailed cart information')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run cart show 123
  $ mage-remote-run cart show 123 --format json
`)
        .action(showCartAction);

    carts.command('list')
        .description('List carts')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .option('--filter <filter...>', 'Filter options (e.g. "field:value:condition_type" or "field:value")', [])
        .option('--sort <sort...>', 'Sort options (e.g. "field:direction")', [])
        .addHelpText('after', `
Examples:
  $ mage-remote-run cart list
  $ mage-remote-run cart list --page 2 --size 50
  $ mage-remote-run cart list --filter "is_active:1"
  $ mage-remote-run cart list --sort "created_at:DESC"
`)
        .action(listCartsAction);
}
