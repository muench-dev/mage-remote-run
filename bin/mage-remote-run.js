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
  })
  .addHelpText('before', chalk.hex('#FFA500')(`
   _ __ ___   __ _  __ _  ___      _ __ ___ _ __ ___   ___ | |_ ___      _ __ _   _ _ __ 
  | '_ \` _ \\ / _\` |/ _\` |/ _ \\____| '__/ _ \\ '_ \` _ \\ / _ \\| __/ _ \\____| '__| | | | '_ \\
  | | | | | | (_| | (_| |  __/____| | |  __/ | | | | | (_) | ||  __/____| |  | |_| | | | |
  |_| |_| |_|\\__,_|\\__, |\\___|    |_|  \\___|_| |_| |_|\\___/ \\__\\___|    |_|   \\__,_|_| |_|
                   |___/                                                                   
`));



import {
  registerCommands
} from '../lib/command-registry.js';
import { getActiveProfile } from '../lib/config.js';
import { startMcpServer } from '../lib/mcp.js';
import { PluginLoader } from '../lib/plugin-loader.js';
import { eventBus, EVENTS } from '../lib/events.js';

// Connection commands are registered dynamically via registerCommands
// But we need them registered early if we want them to show up in help even if config fails?
// Actually registerCommands handles null profile by registering connection commands only.

program.command('mcp [args...]')
  .description('Run as MCP server')
  .option('--transport <type>', 'Transport type (stdio, http)', 'stdio')
  .option('--host <host>', 'HTTP Host', '127.0.0.1')
  .option('--port <port>', 'HTTP Port', '18098')
  .allowExcessArguments(true)
  .allowUnknownOption(true)
  .action(async (args, options) => {
    // We ignore extra arguments but log them for debugging purposes
    if (args && args.length > 0) {
      // console.error(chalk.yellow(`[mage-remote-run] Warning: Received extra arguments for mcp command: ${args.join(' ')}`));
    }
    await startMcpServer(options);
  });

const profile = await getActiveProfile();

// Load Plugins
// We construct an initial context.
// Note: client is not available yet as it is created per command usually, 
// but we can pass a way to get it or just pass null for now if not used at startup.
// Also mcpServer is not running here unless mcp command is used.
const appContext = {
    program,
    config: await loadConfig(), // Re-load or reuse config
    profile,
    eventBus,
    EVENTS
    // We can add a client factory or similar if needed
};

const pluginLoader = new PluginLoader(appContext);
await pluginLoader.loadPlugins();

eventBus.emit(EVENTS.INIT, appContext);

registerCommands(program, profile);

program.hook('preAction', async (thisCommand, actionCommand) => {
  eventBus.emit(EVENTS.BEFORE_COMMAND, { thisCommand, actionCommand, profile });

  // Check if we have an active profile and if format is not json/xml
  // Note: 'options' are available on the command that has them defined.
  // actionCommand is the command actually being executed.
  if (profile) {
    const config = await loadConfig();
    if (config.showActiveConnectionHeader !== false) {
      const opts = actionCommand.opts();
      // Standard output corruption check: Don't print header if output is json/xml OR if running mcp command (which uses stdio)
      if (opts.format !== 'json' && opts.format !== 'xml' && actionCommand.name() !== 'mcp') {
        console.log(chalk.cyan(`Active Connection: ${chalk.bold(profile.name)} (${profile.type})`));
        console.log(chalk.gray('━'.repeat(60)) + '\n');
      }
    }
  }
});

program.hook('postAction', async (thisCommand, actionCommand) => {
    eventBus.emit(EVENTS.AFTER_COMMAND, { thisCommand, actionCommand, profile });
});

import { expandCommandAbbreviations } from '../lib/command-helper.js';

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

try {
  args = expandCommandAbbreviations(program, args);
} catch (e) {
  if (e.isAmbiguous) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
process.argv = [...process.argv.slice(0, 2), ...args];

program.parse(process.argv);
