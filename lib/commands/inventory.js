
import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerInventoryCommands(program) {
    const inventory = program.command('inventory').description('Manage inventory');

    const stock = inventory.command('stock').description('Manage inventory stocks');

    stock.command('list')
        .description('List inventory stocks')
        .addHelpText('after', `
Examples:
  $ mage-remote-run inventory stock list
`)
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('V1/inventory/stocks', {
                    'searchCriteria[currentPage]': 1,
                    'searchCriteria[pageSize]': 50
                });
                // Check if result is items array or object with items
                const items = data.items ? data.items : data;
                const rows = (Array.isArray(items) ? items : []).map(s => [s.stock_id, s.name]);
                printTable(['ID', 'Name'], rows);
            } catch (e) { handleError(e); }
        });

    stock.command('show <stockId>')
        .description('Show stock details')
        .addHelpText('after', `
Examples:
  $ mage-remote-run inventory stock show 1
`)
        .action(async (stockId) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/inventory/stocks/${stockId}`);
                console.log(chalk.bold.blue('\n📦 Stock Information'));
                console.log(chalk.gray('━'.repeat(60)));
                console.log(`  ${chalk.bold('ID:')}             ${data.stock_id}`);
                console.log(`  ${chalk.bold('Name:')}           ${data.name}`);
                if (data.extension_attributes && data.extension_attributes.sales_channels) {
                    console.log(chalk.bold('\n📢 Sales Channels'));
                    data.extension_attributes.sales_channels.forEach(sc => {
                        console.log(`  Type: ${sc.type}, Code: ${sc.code}`);
                    });
                }
                console.log('');
            } catch (e) { handleError(e); }
        });

    inventory.command('resolve-stock <type> <code>')
        .description('Resolve stock for a sales channel')
        .addHelpText('after', `
Examples:
  $ mage-remote-run inventory resolve-stock website base
`)
        .action(async (type, code) => {
            try {
                const client = await createClient();
                const stock = await client.get(`V1/inventory/stock-resolver/${type}/${code}`);
                console.log(chalk.bold(`Resolved Stock ID: ${stock.stock_id}`));
            } catch (e) { handleError(e); }
        });

    const source = inventory.command('source').description('Manage inventory sources');

    source.command('list')
        .description('List inventory sources')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run inventory source list
  $ mage-remote-run inventory source list --page 1 --size 50
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('V1/inventory/sources', params, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                const rows = (data.items || []).map(s => [s.source_code, s.name, s.enabled ? 'Yes' : 'No', s.postcode]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['Code', 'Name', 'Enabled', 'Postcode'], rows);
            } catch (e) { handleError(e); }
        });

    const ssa = source.command('selection-algorithm').description('Manage source selection algorithms');

    ssa.command('list')
        .description('List available source selection algorithms')
        .addHelpText('after', `
Examples:
  $ mage-remote-run inventory source selection-algorithm list
`)
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('V1/inventory/source-selection-algorithm-list');
                const items = data.items ? data.items : data;
                const rows = (Array.isArray(items) ? items : []).map(a => [a.code, a.title, a.description]);
                printTable(['Code', 'Title', 'Description'], rows);
            } catch (e) { handleError(e); }
        });
}
