import { loadConfig, saveConfig, addProfile, clearTokenCache } from '../config.js';
import { printTable, handleError } from '../utils.js';
import { askForProfileSettings } from '../prompts.js';
import { createClient } from '../api/factory.js';
import { input, confirm, select } from '@inquirer/prompts';
import inquirer from 'inquirer';
import chalk from 'chalk';

// Helper to handle interactive connection configuration and testing
async function configureAndTestConnection(name, initialSettings = {}) {
    let settings = await askForProfileSettings(initialSettings);

    while (true) {
        const shouldTest = await confirm({
            message: 'Test connection?',
            default: true
        });

        if (shouldTest) {
            console.log(chalk.blue(`\nTesting connection "${name}"...`));
            try {
                const client = await createClient(settings);
                const start = Date.now();
                await client.get('V1/store/storeViews');
                const duration = Date.now() - start;
                console.log(chalk.green(`✔ Connection successful! (${duration}ms)`));
                break; // Test passed, proceed to save
            } catch (e) {
                console.error(chalk.red(`✖ Connection failed: ${e.message}`));
                const shouldEdit = await confirm({
                    message: 'Connection failed. Do you want to change settings?',
                    default: true
                });

                if (shouldEdit) {
                    // Re-ask for settings using current values as defaults
                    settings = await askForProfileSettings(settings);
                    continue; // Loop back to test
                } else {
                    // If they don't want to edit, ask if they want to save anyway
                    const saveAnyway = await confirm({
                        message: 'Save configuration anyway?',
                        default: false
                    });
                    if (!saveAnyway) {
                        return null;
                    }
                    break; // Break to save
                }
            }
        } else {
            // User skipped test, save
            break;
        }
    }
    return settings;
}


export function registerConnectionCommands(program) {
    const connections = program.command('connection').description('Manage mage-remote-run connection profiles');

    connections.command('add')
        .description('Configure a new connection profile')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection add
`)
        .action(async () => {
            console.log(chalk.blue('Configure a new connection Profile'));
            try {
                const name = await input({
                    message: 'Profile Name:',
                    validate: value => value ? true : 'Name is required'
                });

                const settings = await configureAndTestConnection(name);
                if (!settings) {
                    console.log(chalk.yellow('\nConfiguration cancelled.'));
                    return;
                }

                await addProfile(name, settings);
                console.log(chalk.green(`\nProfile "${name}" saved successfully!`));

                // Ask to set as active if multiple exist
                const config = await loadConfig();
                if (Object.keys(config.profiles).length > 1) {
                    const setActive = await confirm({
                        message: 'Set this as the active profile?',
                        default: true
                    });

                    if (setActive) {
                        config.activeProfile = name;
                        await saveConfig(config);
                        console.log(chalk.green(`Profile "${name}" set as active.`));
                    }
                }
            } catch (e) {
                if (e.name === 'ExitPromptError') {
                    console.log(chalk.yellow('\nConfiguration cancelled.'));
                    return;
                }
                handleError(e);
            }
        });

    connections.command('list')
        .description('List connection profiles')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection list
`)
        .action(async () => {
            try {
                const config = await loadConfig();
                const rows = Object.entries(config.profiles || {}).map(([name, p]) => [
                    name,
                    p.type,
                    p.url,
                    name === config.activeProfile ? chalk.green('Yes') : 'No'
                ]);
                printTable(['Name', 'Type', 'URL', 'Active'], rows);
            } catch (e) { handleError(e); }
        });

    connections.command('search <query>')
        .description('Search connection profiles')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection search production
`)
        .action(async (query) => {
            try {
                const config = await loadConfig();
                const filtered = Object.entries(config.profiles || {}).filter(([name]) => name.includes(query));
                const rows = filtered.map(([name, p]) => [name, p.type, p.url]);
                printTable(['Name', 'Type', 'URL'], rows);
            } catch (e) { handleError(e); }
        });

    connections.command('delete <name>')
        .description('Delete a connection profile')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection delete "Production"
`)
        .action(async (name) => {
            try {
                const config = await loadConfig();
                if (!config.profiles[name]) throw new Error(`Profile ${name} not found`);

                const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: `Delete profile ${name}?` }]);
                if (!confirm) return;

                delete config.profiles[name];
                if (config.activeProfile === name) config.activeProfile = null;
                await saveConfig(config);
                console.log(chalk.green(`Profile ${name} deleted.`));
            } catch (e) { handleError(e); }
        });

    connections.command('edit [name]')
        .description('Edit a connection profile')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection edit
  $ mage-remote-run connection edit "Production"
`)
        .action(async (name) => {
            try {
                const config = await loadConfig();
                const profiles = Object.keys(config.profiles || {});

                if (profiles.length === 0) {
                    console.log(chalk.yellow('No profiles found to edit.'));
                    return;
                }

                if (!name) {
                    name = await select({
                        message: 'Select Profile to Edit:',
                        choices: profiles.map(p => ({ value: p, name: p }))
                    });
                }

                const profile = config.profiles[name];
                if (!profile) throw new Error(`Profile ${name} not found`);

                console.log(chalk.blue(`Editing profile "${name}"`));

                const settings = await configureAndTestConnection(name, profile);
                if (!settings) {
                    console.log(chalk.yellow('\nEdit cancelled.'));
                    return;
                }

                config.profiles[name] = settings;
                await saveConfig(config);
                console.log(chalk.green(`Profile "${name}" updated.`));
            } catch (e) {
                if (e.name === 'ExitPromptError') {
                    console.log(chalk.yellow('\nEdit cancelled.'));
                    return;
                }
                handleError(e);
            }
        });

    connections.command('test')
        .description('Test connection(s)')
        .option('--all', 'Test all configured connections')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection test
  $ mage-remote-run connection test --all
`)
        .action(async (options) => {
            try {
                const config = await loadConfig();

                if (options.all) {
                    const profiles = Object.keys(config.profiles || {});
                    if (profiles.length === 0) {
                        console.log(chalk.yellow('No profiles found.'));
                        return;
                    }
                    console.log(chalk.blue(`Testing ${profiles.length} connections...\n`));

                    const results = [];
                    for (const name of profiles) {
                        try {
                            const profileConfig = config.profiles[name];
                            const client = await createClient(profileConfig);

                            const start = Date.now();
                            await client.get('V1/store/storeViews');
                            const duration = Date.now() - start;

                            results.push([name, chalk.green('SUCCESS'), `${duration}ms`]);
                        } catch (e) {
                            results.push([name, chalk.red('FAILED'), e.message]);
                        }
                    }

                    console.log(chalk.bold('Connection Test Results:'));
                    printTable(['Profile', 'Status', 'Details'], results);

                } else {
                    if (!config.activeProfile) {
                        console.log(chalk.yellow('No active profile configured. Run "connection add" or "connection test --all".'));
                        return;
                    }
                    console.log(`Testing active connection: ${chalk.bold(config.activeProfile)}...`);
                    try {
                        const client = await createClient(); // Uses active profile
                        const start = Date.now();
                        await client.get('V1/store/storeViews');
                        const duration = Date.now() - start;

                        console.log(chalk.green(`\n✔ Connection successful! (${duration}ms)`));
                    } catch (e) {
                        console.error(chalk.red('\n✖ Connection failed:'), e.message);
                        if (process.env.DEBUG) console.error(e);
                    }
                }
            } catch (e) {
                console.error(chalk.red('Test failed:'), e.message);
                if (process.env.DEBUG) console.error(e);
            }
        });
    connections.command('status')
        .description('Show current configuration status')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection status
`)
        .action(async () => {
            try {
                const config = await loadConfig();
                if (!config.activeProfile) {
                    console.log(chalk.yellow('No active profile configured. Run "connection add" or "connection select".'));
                    return;
                }
                console.log(chalk.bold('Active Profile:'), chalk.green(config.activeProfile));
                const profile = config.profiles[config.activeProfile];
                if (profile) {
                    console.log(`Type: ${profile.type}`);
                    console.log(`URL: ${profile.url}`);
                } else {
                    console.log(chalk.red('Profile not found in configuration!'));
                }
            } catch (e) { handleError(e); }
        });

    connections.command('select')
        .description('Select the active connection profile (aliases: change, switch)')
        .aliases(['switch', 'change'])
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection select
  $ mage-remote-run connection switch
`)
        .action(async () => {
            try {
                const config = await loadConfig();
                const profiles = Object.keys(config.profiles || {});
                if (profiles.length === 0) {
                    console.log(chalk.yellow('No profiles found. Run "connection add" first.'));
                    return;
                }

                const selected = await select({
                    message: 'Select Active Profile:',
                    choices: profiles.map(p => ({ value: p, name: p })),
                    default: config.activeProfile
                });

                config.activeProfile = selected;
                await saveConfig(config);
                console.log(chalk.green(`Active profile set to "${selected}".`));
            } catch (e) { handleError(e); }
        });

    connections.command('clear-token-cache')
        .description('Clear cached access tokens')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection clear-token-cache
`)
        .action(async () => {
            try {
                await clearTokenCache();
                console.log(chalk.green('Token cache cleared.'));
            } catch (e) { handleError(e); }
        });

    connections.command('status-header <state>')
        .description('Enable or disable the active connection header (on|off)')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection status-header on
  $ mage-remote-run connection status-header off
`)
        .action(async (state) => {
            try {
                if (state !== 'on' && state !== 'off') {
                    console.error(chalk.red('Invalid state. Use "on" or "off".'));
                    return;
                }
                const config = await loadConfig();
                config.showActiveConnectionHeader = state === 'on';
                await saveConfig(config);
                console.log(chalk.green(`Active connection header is now ${state === 'on' ? 'enabled' : 'disabled'}.`));
            } catch (e) { handleError(e); }
        });
}
