import {
  listSelectionAlgorithmsAction,
  listSourcesAction,
  listStocksAction,
  resolveStockAction,
  showStockAction
} from './inventory-actions.js';

import { addPaginationOptions } from '../utils.js';

export function registerInventoryCommands(program) {
  const inventory = program.command('inventory').description('Manage inventory');
  const stock = inventory.command('stock').description('Manage inventory stocks');

  stock.command('list')
    .description('List inventory stocks')
    .addHelpText('after', `
Examples:
  $ mage-remote-run inventory stock list
`)
    .action(listStocksAction);

  stock.command('show <stockId>')
    .description('Show stock details')
    .addHelpText('after', `
Examples:
  $ mage-remote-run inventory stock show 1
`)
    .action(showStockAction);

  inventory.command('resolve-stock <type> <code>')
    .description('Resolve stock for a sales channel')
    .addHelpText('after', `
Examples:
  $ mage-remote-run inventory resolve-stock website base
`)
    .action(resolveStockAction);

  const source = inventory.command('source').description('Manage inventory sources');

  addPaginationOptions(source.command('list')
    .description('List inventory sources'))
    .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
    .addHelpText('after', `
Examples:
  $ mage-remote-run inventory source list
  $ mage-remote-run inventory source list --page 1 --size 50
`)
    .action(listSourcesAction);

  const ssa = source.command('selection-algorithm').description('Manage source selection algorithms');

  ssa.command('list')
    .description('List available source selection algorithms')
    .addHelpText('after', `
Examples:
  $ mage-remote-run inventory source selection-algorithm list
`)
    .action(listSelectionAlgorithmsAction);
}
