#!/usr/bin/env node

import { Command } from 'commander';
import { loadConfig } from '../lib/config.js';
import chalk from 'chalk';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

const program = new Command();

program
    .name('mage-remote-run')
    .description('The remote swiss army knife for Magento Open Source, Mage-OS, Adobe Commerce')
    .version(pkg.version);



import { registerWebsitesCommands } from '../lib/commands/websites.js';
import { registerStoresCommands } from '../lib/commands/stores.js';
import { registerConnectionCommands } from '../lib/commands/connections.js';
import { registerCustomersCommands } from '../lib/commands/customers.js';
import { registerOrdersCommands } from '../lib/commands/orders.js';
import { registerEavCommands } from '../lib/commands/eav.js';
import { registerProductsCommands } from '../lib/commands/products.js';
import { registerTaxCommands } from '../lib/commands/tax.js';

registerConnectionCommands(program);
registerWebsitesCommands(program);
registerStoresCommands(program);
registerCustomersCommands(program);
registerOrdersCommands(program);
registerEavCommands(program);
registerProductsCommands(program);
registerTaxCommands(program);

// Check for first run (no profiles configured and no arguments or just help)
// We need to check args length.
// node script.js -> length 2.
// node script.js command -> length 3.
const args = process.argv.slice(2);
const config = await loadConfig();
const hasProfiles = Object.keys(config.profiles || {}).length > 0;

if (!hasProfiles && args.length === 0) {
    console.log(chalk.bold.blue('Welcome to mage-remote-run! 🚀'));
    console.log(chalk.gray('The remote swiss army knife for Magento Open Source, Mage-OS, Adobe Commerce'));
    console.log(chalk.gray('It looks like you haven\'t configured any connections yet.'));
    console.log(chalk.gray('Let\'s set up your first connection now.\n'));

    // Trigger the interactive add command directly
    // We can simulate running the 'connection add' command
    // But since we are at top level, we might need to invoke it manually or parse specific args.
    // Easiest is to manually invoke program.parse with ['node', 'script', 'connection', 'add']
    // BUT program.parse executes asynchronously usually? commander is synchronous by default but actions are async.
    // Let's modify process.argv before parsing.
    process.argv = [...process.argv.slice(0, 2), 'connection', 'add'];
}

program.parse(process.argv);
