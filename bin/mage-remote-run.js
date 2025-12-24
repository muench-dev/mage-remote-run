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
    .version(pkg.version)
    .configureHelp({
        visibleCommands: (cmd) => {
            const commands = cmd.commands.filter(c => !c._hidden);
            return commands.sort((a, b) => {
                if (a.name() === 'connection') return -1;
                if (b.name() === 'connection') return 1;
                return a.name().localeCompare(b.name());
            });
        },
        subcommandTerm: (cmd) => chalk.cyan(cmd.name()),
        subcommandDescription: (cmd) => chalk.gray(cmd.description()),
        optionTerm: (option) => chalk.yellow(option.flags),
        optionDescription: (option) => chalk.gray(option.description)
    });



import { registerWebsitesCommands } from '../lib/commands/websites.js';
import { registerStoresCommands } from '../lib/commands/stores.js';
import { registerConnectionCommands } from '../lib/commands/connections.js';
import { registerCustomersCommands } from '../lib/commands/customers.js';
import { registerOrdersCommands } from '../lib/commands/orders.js';
import { registerEavCommands } from '../lib/commands/eav.js';
import { registerProductsCommands } from '../lib/commands/products.js';
import { registerCompanyCommands } from '../lib/commands/company.js';
import { registerTaxCommands } from '../lib/commands/tax.js';
import { registerInventoryCommands } from '../lib/commands/inventory.js';
import { registerAdobeIoEventsCommands } from '../lib/commands/adobe-io-events.js';
import { registerWebhooksCommands } from '../lib/commands/webhooks.js';
import { getActiveProfile } from '../lib/config.js';

registerConnectionCommands(program);

const profile = await getActiveProfile();

if (profile) {
    registerWebsitesCommands(program);
    registerStoresCommands(program);
    registerCustomersCommands(program);
    registerOrdersCommands(program);
    registerEavCommands(program);
    registerProductsCommands(program);
    registerTaxCommands(program);
    registerInventoryCommands(program);

    if (profile.type === 'ac-cloud-paas' || profile.type === 'ac-saas') {
        registerAdobeIoEventsCommands(program);
        registerCompanyCommands(program);
        registerWebhooksCommands(program);
    }
}

program.hook('preAction', async (thisCommand, actionCommand) => {
    // Check if we have an active profile and if format is not json/xml
    // Note: 'options' are available on the command that has them defined.
    // actionCommand is the command actually being executed.
    if (profile) {
        const config = await loadConfig();
        if (config.showActiveConnectionHeader !== false) {
            const opts = actionCommand.opts();
            if (opts.format !== 'json' && opts.format !== 'xml') {
                console.log(chalk.cyan(`Active Connection: ${chalk.bold(profile.name)} (${profile.type})`));
                console.log(chalk.gray('━'.repeat(60)) + '\n');
            }
        }
    }
});

function resolveCommandMatch(parent, token) {
    const tokenLower = token.toLowerCase();

    // Check for exact match first
    const exactMatch = parent.commands.find((cmd) => {
        return cmd.name().toLowerCase() === tokenLower;
    });

    if (exactMatch) {
        return {
            match: exactMatch,
            matches: [exactMatch]
        };
    }

    const matches = parent.commands.filter((cmd) => {
        const name = cmd.name().toLowerCase();
        if (name.startsWith(tokenLower)) return true;
        const aliases = cmd.aliases ? cmd.aliases() : [];
        return aliases.some((alias) => alias.toLowerCase().startsWith(tokenLower));
    });

    return {
        match: matches.length === 1 ? matches[0] : null,
        matches
    };
}

function expandCommandAbbreviations(rootCommand, argv) {
    const expanded = [];
    let current = rootCommand;
    const path = [];

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];
        if (token.startsWith('-')) {
            expanded.push(token);
            continue;
        }

        if (!current.commands || current.commands.length === 0) {
            expanded.push(...argv.slice(i));
            break;
        }

        const { match, matches } = resolveCommandMatch(current, token);
        if (!match) {
            if (matches.length > 1) {
                const parentName = path.length > 0 ? path.join(' ') : current.name();
                const options = matches.map((cmd) => cmd.name()).join(', ');
                console.error(`Ambiguous command "${token}" under "${parentName}". Options: ${options}.`);
                process.exit(1);
            }
            expanded.push(token);
            continue;
        }

        expanded.push(match.name());
        current = match;
        path.push(match.name());
    }

    return expanded;
}

// Check for first run (no profiles configured and no arguments or just help)
// We need to check args length.
// node script.js -> length 2.
// node script.js command -> length 3.
let args = process.argv.slice(2);
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
    args = ['connection', 'add'];
}

args = expandCommandAbbreviations(program, args);
process.argv = [...process.argv.slice(0, 2), ...args];

program.parse(process.argv);
