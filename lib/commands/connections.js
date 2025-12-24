import { loadConfig, saveConfig, addProfile, clearTokenCache } from '../config.js';
import { printTable, handleError } from '../utils.js';
import { askForProfileSettings } from '../prompts.js';
import { createClient } from '../api/factory.js';
import { input, confirm, select } from '@inquirer/prompts';
import inquirer from 'inquirer';
import chalk from 'chalk';

export function registerConnectionCommands(program) {
    const connections = program.command('connection').description('Manage mage-remote-run connection profiles');

    connections.command('add')
        .description('Configure a new connection profile')
        .action(async () => {
            console.log(chalk.blue('Configure a new connection Profile'));
            try {
                const name = await input({
                    message: 'Profile Name:',
                    validate: value => value ? true : 'Name is required'
                });

                const settings = await askForProfileSettings();

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

    connections.command('edit <name>')
        .description('Edit a connection profile')
        .action(async (name) => {
            try {
                const config = await loadConfig();
                const profile = config.profiles[name];
                if (!profile) throw new Error(`Profile ${name} not found`);

                const settings = await askForProfileSettings(profile);

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
        .action(async () => {
            try {
                await clearTokenCache();
                console.log(chalk.green('Token cache cleared.'));
            } catch (e) { handleError(e); }
        });

    connections.command('status-header <state>')
        .description('Enable or disable the active connection header (on|off)')
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
