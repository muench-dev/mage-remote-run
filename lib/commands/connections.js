import { loadConfig, saveConfig, addProfile, clearTokenCache } from '../config.js';
import { printTable, handleError } from '../utils.js';
import { askForProfileSettings } from '../prompts.js';
import { createClient } from '../api/factory.js';
import { input, confirm, select } from '@inquirer/prompts';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { getMissingB2BModules } from '../b2b.js';

// Helper to test connection (non-interactive or one-shot)
async function testConnection(name, settings) {
    console.log(chalk.blue(`\nTesting connection "${name}"...`));
    try {
        const client = await createClient(settings);
        const start = Date.now();
        await client.get('V1/store/storeViews');
        const duration = Date.now() - start;
        console.log(chalk.green(`✔ Connection successful! (${duration}ms)`));
        return { success: true };
    } catch (e) {
        console.error(chalk.red(`✖ Connection failed: ${e.message}`));
        return { success: false, error: e };
    }
}

// Helper to handle interactive connection configuration and testing
async function configureAndTestConnection(name, initialSettings = {}) {
    let settings = await askForProfileSettings(initialSettings);
    let lastTestError = null;

    while (true) {
        const shouldTest = await confirm({
            message: 'Test connection?',
            default: true
        });

        if (shouldTest) {
            const result = await testConnection(name, settings);
            
            if (result.success) {
                lastTestError = null;
                break; // Test passed, proceed to save
            } else {
                lastTestError = result.error;
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
    settings = await updateProfileCapabilities(settings, lastTestError);
    return settings;
}

function shouldCheckB2BModules(settings) {
    return settings && ['ac-cloud-paas', 'ac-on-prem'].includes(settings.type);
}

function shouldCheckHyvaModules(settings) {
    return settings && ['magento-os', 'mage-os', 'ac-on-prem', 'ac-cloud-paas'].includes(settings.type);
}

async function updateProfileCapabilities(settings, lastTestError) {
    if (settings && settings.type === 'ac-saas') {
        settings.b2bModulesAvailable = true;
        settings.hyvaCommerceAvailable = false;
        settings.hyvaThemeAvailable = false;
        return settings;
    }

    if (!shouldCheckB2BModules(settings) && !shouldCheckHyvaModules(settings)) {
        if (settings && 'b2bModulesAvailable' in settings) delete settings.b2bModulesAvailable;
        if (settings && 'hyvaCommerceAvailable' in settings) delete settings.hyvaCommerceAvailable;
        if (settings && 'hyvaThemeAvailable' in settings) delete settings.hyvaThemeAvailable;
        if (settings && 'hyvaModulesAvailable' in settings) delete settings.hyvaModulesAvailable; // Cleanup legacy
        return settings;
    }

    try {
        const client = await createClient(settings);
        const data = await client.get('V1/modules');
        const modules = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
        
        if (shouldCheckB2BModules(settings)) {
            const missing = getMissingB2BModules(modules);
            settings.b2bModulesAvailable = missing.length === 0;
            if (process.env.DEBUG) {
                if (settings.b2bModulesAvailable) {
                    console.log(chalk.gray('DEBUG: B2B modules detected.'));
                } else {
                    console.log(chalk.gray(`DEBUG: Missing B2B modules: ${missing.join(', ')}`));
                }
            }
        }

        if (shouldCheckHyvaModules(settings)) {
            settings.hyvaCommerceAvailable = modules.includes('Hyva_Commerce');
            settings.hyvaThemeAvailable = modules.includes('Hyva_Theme');

            // Cleanup old property if exists
            if ('hyvaModulesAvailable' in settings) delete settings.hyvaModulesAvailable;

            if (process.env.DEBUG) {
                if (settings.hyvaCommerceAvailable) console.log(chalk.gray('DEBUG: Hyvä Commerce detected.'));
                if (settings.hyvaThemeAvailable) console.log(chalk.gray('DEBUG: Hyvä Theme detected.'));
            }
        }

    } catch (e) {
        if (process.env.DEBUG) {
            const suffix = lastTestError ? ' (connection test failed)' : '';
            console.log(chalk.gray(`DEBUG: Unable to detect modules${suffix}: ${e.message}`));
        }
        if (shouldCheckB2BModules(settings)) settings.b2bModulesAvailable = null;
        if (shouldCheckHyvaModules(settings)) {
            settings.hyvaCommerceAvailable = null;
            settings.hyvaThemeAvailable = null;
        }
    }

    return settings;
}

async function ensureProfileCapabilities(profileName, profile, config) {
    if (!profile || !profile.type) {
        return false;
    }

    let updated = false;

    // Migrate old property if exists
    if ('hyvaModulesAvailable' in profile) {
        profile.hyvaCommerceAvailable = profile.hyvaModulesAvailable;
        delete profile.hyvaModulesAvailable;
        updated = true;
    }

    if (profile.type === 'ac-saas') {
        if (profile.b2bModulesAvailable !== true) {
            profile.b2bModulesAvailable = true;
            updated = true;
        }
        if (profile.hyvaCommerceAvailable !== false) {
            profile.hyvaCommerceAvailable = false;
            updated = true;
        }
        if (profile.hyvaThemeAvailable !== false) {
            profile.hyvaThemeAvailable = false;
            updated = true;
        }
        if (updated) config.profiles[profileName] = profile;
        return updated;
    }

    const checkB2B = shouldCheckB2BModules(profile);
    const checkHyva = shouldCheckHyvaModules(profile);

    if (!checkB2B && !checkHyva) return false;

    // Check if we need to detect
    const needsB2B = checkB2B && profile.b2bModulesAvailable === undefined;
    const needsHyva = checkHyva && (profile.hyvaCommerceAvailable === undefined || profile.hyvaThemeAvailable === undefined);

    if (needsB2B || needsHyva) {
        const newSettings = await updateProfileCapabilities({ ...profile });
        
        if (checkB2B) {
            profile.b2bModulesAvailable = newSettings.b2bModulesAvailable;
        }
        if (checkHyva) {
            profile.hyvaCommerceAvailable = newSettings.hyvaCommerceAvailable;
            profile.hyvaThemeAvailable = newSettings.hyvaThemeAvailable;
        }
        
        config.profiles[profileName] = profile;
        return true;
    }

    if (updated) config.profiles[profileName] = profile;
    return updated;
}

// Helper to print connection status
async function printConnectionStatus(config, options = {}) {
    if (!config.activeProfile) {
        if (options.format === 'json') {
            console.log(JSON.stringify({ error: 'No active profile configured' }));
        } else {
            console.log(chalk.yellow('No active profile configured. Run "connection add" or "connection select".'));
        }
        return;
    }

    const profile = config.profiles[config.activeProfile];

    if (profile) {
        if (options.format === 'json') {
            console.log(JSON.stringify({
                activeProfile: config.activeProfile,
                ...profile
            }, null, 2));
            return;
        }

        // ASCII Logos
        const logos = {
            adobe: chalk.red(`
   @@@@@@@@@@@@@@@         @@@@@@@@@@@@@@@   
   @@@@@@@@@@@@@@           @@@@@@@@@@@@@@   
   @@@@@@@@@@@@@             @@@@@@@@@@@@@   
   @@@@@@@@@@@@@              @@@@@@@@@@@@   
   @@@@@@@@@@@@               @@@@@@@@@@@@   
   @@@@@@@@@@@                 @@@@@@@@@@@   
   @@@@@@@@@@                   @@@@@@@@@@   
   @@@@@@@@@         @@@         @@@@@@@@@   
   @@@@@@@@@         @@@         @@@@@@@@@   
   @@@@@@@@         @@@@@         @@@@@@@@   
   @@@@@@@         @@@@@@@         @@@@@@@   
   @@@@@@         @@@@@@@@@         @@@@@@   
   @@@@@@        @@@@@@@@@@@        @@@@@@   
   @@@@@        @@@@@@@@@@@@         @@@@@   
   @@@@         @@@@@@@@@@@@@         @@@@   
   @@@                 @@@@@@@         @@@   
   @@                   @@@@@@@         @@   
   @@                    @@@@@@         @@   
                                             
                                             
                                             `),
            magento: chalk.hex('#FFA500')(`                        
                         @@                        
                      @@@@@@@@                     
                   @@@@@@@@@@@@@@                  
                @@@@@@@@@@@@@@@@@@@@               
             @@@@@@@@@@@@@@@@@@@@@@@@@@            
          @@@@@@@@@@@@@@    @@@@@@@@@@@@@@         
       @@@@@@@@@@@@@@          @@@@@@@@@@@@@@      
     @@@@@@@@@@@@@                @@@@@@@@@@@@@    
     @@@@@@@@@@                      @@@@@@@@@@    
     @@@@@@@        @@@@    @@@@        @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
     @@@@@@@     @@@@@@@    @@@@@@@     @@@@@@@    
       @@@@@     @@@@@@@    @@@@@@@     @@@@@      
         @@@     @@@@@@@    @@@@@@@     @@@        
                 @@@@@@@@@@@@@@@@@@                
                 @@@@@@@@@@@@@@@@@@                
                   @@@@@@@@@@@@@@                  
                      @@@@@@@@                     
                         @@                        `),
            mageos: chalk.hex('#FFA500')(`
               ======          ======              
            ============    ============           
        ====================================       
     ==========================================    
  ================================================ 
================================-===============--
=============----============----============-----
=========--------=========-------=========--------
========---------========--------========---------
========---------========--------========---------
========---------========--------========---------
   =====------     ======------     =====------   
     ==---           ===---           ==---        
`)
        };

        let logo = '';
        if (profile.type && profile.type.startsWith('ac-')) {
            logo = logos.adobe;
        } else if (profile.type === 'mage-os') {
            logo = logos.mageos;
        } else if (profile.type === 'magento-os') {
            logo = logos.magento;
        }

        if (logo) {
            console.log(logo);
        }

        const rows = [
            ['Active Profile', chalk.green(config.activeProfile)],
            ['Type', profile.type],
            ['URL', profile.url]
        ];

        if (['ac-cloud-paas', 'ac-on-prem', 'ac-saas'].includes(profile.type)) {
            let b2bStatus = '?';
            if (profile.type === 'ac-saas') {
                b2bStatus = chalk.green('Yes');
            } else if (profile.b2bModulesAvailable === true) {
                b2bStatus = chalk.green('Yes');
            } else if (profile.b2bModulesAvailable === false) {
                b2bStatus = chalk.yellow('No');
            }
            rows.push(['B2B Modules', b2bStatus]);
        }

        if (['magento-os', 'mage-os', 'ac-on-prem', 'ac-cloud-paas'].includes(profile.type)) {
            let hyvaCommerceStatus = '?';
            if (profile.hyvaCommerceAvailable === true) {
                hyvaCommerceStatus = chalk.green('Yes');
            } else if (profile.hyvaCommerceAvailable === false) {
                hyvaCommerceStatus = chalk.yellow('No');
            }
            rows.push(['Hyvä Commerce', hyvaCommerceStatus]);

            let hyvaThemeStatus = '?';
            if (profile.hyvaThemeAvailable === true) {
                hyvaThemeStatus = chalk.green('Yes');
            } else if (profile.hyvaThemeAvailable === false) {
                hyvaThemeStatus = chalk.yellow('No');
            }
            rows.push(['Hyvä Theme', hyvaThemeStatus]);
        }

        printTable(['Configuration', 'Value'], rows);
    } else {
        console.log(chalk.red('Profile not found in configuration!'));
    }
}


export function registerConnectionCommands(program) {
    const connections = program.command('connection').description('Manage mage-remote-run connection profiles');


    //-------------------------------------------------------
    // "connection add" Command
    //-------------------------------------------------------
    connections.command('add')
        .description('Configure a new connection profile')
        .option('--name <name>', 'Profile Name')
        .option('--type <type>', 'System Type (magento-os, mage-os, ac-on-prem, ac-cloud-paas, ac-saas)')
        .option('--url <url>', 'Instance URL')
        .option('--client-id <id>', 'Client ID (SaaS)')
        .option('--client-secret <secret>', 'Client Secret (SaaS)')
        .option('--auth-method <method>', 'Auth Method (bearer, oauth1)')
        .option('--token <token>', 'Bearer Token')
        .option('--consumer-key <key>', 'Consumer Key (OAuth1)')
        .option('--consumer-secret <secret>', 'Consumer Secret (OAuth1)')
        .option('--access-token <token>', 'Access Token (OAuth1)')
        .option('--token-secret <secret>', 'Token Secret (OAuth1)')
        .option('--signature-method <method>', 'Signature Method (hmac-sha256, hmac-sha1)', 'hmac-sha256')
        .option('--active', 'Set as active profile')
        .option('--no-test', 'Skip connection test')
        .addHelpText('after', `
Examples:
  Interactive Mode:
  $ mage-remote-run connection add

  SaaS (Non-Interactive):
  $ mage-remote-run connection add --name "MySaaS" --type ac-saas --url "https://example.com" --client-id "id" --client-secret "secret" --active

  SaaS (Pre-generated Token):
  $ mage-remote-run connection add --name "MySaaS" --type ac-saas --url "https://example.com" --token "access_token_here"

  PaaS (Integration Token):
  $ mage-remote-run connection add --name "MyPaaS" --type ac-cloud-paas --url "https://paas.example.com" --token "integration_token"

  OAuth 1.0a (Non-Interactive):
  $ mage-remote-run connection add --name "MyOAuth" --type ac-on-prem --url "https://example.com" --consumer-key "ck" --consumer-secret "cs" --access-token "at" --token-secret "ts"

  Bearer Token (Non-Interactive):
  $ mage-remote-run connection add --name "MyStore" --type magento-os --url "https://magento.example.com" --token "tkn"
`)
        .action(async (options) => {
            console.log(chalk.blue('Configure a new connection Profile'));
            try {
                let name = options.name;
                let settings = null;

                // Non-Interactive Mode
                if (options.type) {
                    if (!name) {
                        throw new Error('Option --name is required when using --type');
                    }
                    if (!options.url) {
                        throw new Error('Option --url is required when using --type');
                    }

                    settings = {
                        type: options.type,
                        url: options.url,
                        auth: {}
                    };

                    if (options.type === 'ac-saas') {
                        if (options.token) {
                            settings.auth = { token: options.token };
                            // Optional: still save client ID/secret if provided, but token takes precedence
                            if (options.clientId) settings.auth.clientId = options.clientId;
                            if (options.clientSecret) settings.auth.clientSecret = options.clientSecret;
                        } else if (!options.clientId || !options.clientSecret) {
                            throw new Error('SaaS authentication requires --client-id and --client-secret (or --token)');
                        } else {
                            settings.auth = {
                                clientId: options.clientId,
                                clientSecret: options.clientSecret
                            };
                        }
                    } else {
                        // Infer auth method if not provided
                        let method = options.authMethod;
                        if (!method) {
                            if (options.token) {
                                method = 'bearer';
                            } else if (options.consumerKey && options.consumerSecret) {
                                method = 'oauth1';
                            }
                        }

                        if (method === 'bearer') {
                            if (!options.token) {
                                throw new Error('Bearer authentication requires --token');
                            }
                            settings.auth = {
                                method: 'bearer',
                                token: options.token
                            };
                        } else if (method === 'oauth1') {
                            if (!options.consumerKey || !options.consumerSecret || !options.accessToken || !options.tokenSecret) {
                                throw new Error('OAuth1 authentication requires --consumer-key, --consumer-secret, --access-token, and --token-secret');
                            }
                            settings.auth = {
                                method: 'oauth1',
                                consumerKey: options.consumerKey,
                                consumerSecret: options.consumerSecret,
                                accessToken: options.accessToken,
                                tokenSecret: options.tokenSecret,
                                signatureMethod: options.signatureMethod
                            };
                        } else {
                            throw new Error('Invalid or missing authentication options. Use --token for Bearer or provide OAuth keys.');
                        }
                    }

                    // Test connection if not skipped
                    let lastTestError = null;
                    if (options.test !== false) { // --no-test sets options.test to false
                         const result = await testConnection(name, settings);
                         if (!result.success) {
                             throw new Error(`Connection test failed: ${result.error.message}`);
                         }
                    }

                    settings = await updateProfileCapabilities(settings, lastTestError);

                } else {
                    // Interactive Mode
                    name = await input({
                        message: 'Profile Name:',
                        validate: value => value ? true : 'Name is required'
                    });

                    settings = await configureAndTestConnection(name);
                    if (!settings) {
                        console.log(chalk.yellow('\nConfiguration cancelled.'));
                        return;
                    }
                }

                await addProfile(name, settings);
                console.log(chalk.green(`\nProfile "${name}" saved successfully!`));

                const config = await loadConfig();
                
                let setActive = false;
                if (options.type) {
                    // Non-interactive: only set active if requested or if it's the only one (handled by addProfile implicitly for first one, but we check logic here)
                    if (options.active) {
                        setActive = true;
                    }
                } else {
                    // Interactive
                    if (Object.keys(config.profiles).length > 1) {
                        setActive = await confirm({
                            message: 'Set this as the active profile?',
                            default: true
                        });
                    }
                }
                
                // addProfile already sets active if it's the first profile. 
                // We only need to force it if requested or confirmed and it wasn't already set (e.g. multiple profiles)
                // Actually addProfile sets it if !activeProfile. 
                
                if (setActive && config.activeProfile !== name) {
                     config.activeProfile = name;
                     await saveConfig(config);
                     console.log(chalk.green(`Profile "${name}" set as active.`));
                }
                
            } catch (e) {
                if (e.name === 'ExitPromptError') {
                    console.log(chalk.yellow('\nConfiguration cancelled.'));
                    return;
                }
                handleError(e);
            }
        });


    //-------------------------------------------------------
    // "connection list" Command
    //-------------------------------------------------------
    connections.command('list')
        .description('List connection profiles')
        .option('--format <format>', 'Output format (table, json, csv)', 'table')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection list
  $ mage-remote-run connection list --format json
  $ mage-remote-run connection list --format csv
`)
        .action(async (options) => {
            try {
                const config = await loadConfig();
                let updated = false;
                for (const [name, profile] of Object.entries(config.profiles || {})) {
                    updated = (await ensureProfileCapabilities(name, profile, config)) || updated;
                }
                if (updated) {
                    await saveConfig(config);
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(config.profiles || {}, null, 2));
                    return;
                }

                if (options.format === 'csv') {
                    const { stringify } = await import('csv-stringify/sync');
                    const rows = Object.entries(config.profiles || {}).map(([name, p]) => ({
                        name,
                        type: p.type,
                        url: p.url,
                        b2b_modules_available: p.b2bModulesAvailable,
                        hyva_theme_available: p.hyvaThemeAvailable,
                        hyva_commerce_available: p.hyvaCommerceAvailable,
                        active: name === config.activeProfile
                    }));
                    console.log(stringify(rows, { header: true }));
                    return;
                }

                const rows = Object.entries(config.profiles || {}).map(([name, p]) => [
                    name,
                    p.type,
                    p.url,
                    ['ac-cloud-paas', 'ac-on-prem', 'ac-saas'].includes(p.type)
                        ? (p.type === 'ac-saas'
                            ? 'Yes'
                            : (p.b2bModulesAvailable === true ? 'Yes' : (p.b2bModulesAvailable === false ? 'No' : '?')))
                        : '',
                    (p.hyvaThemeAvailable === true ? 'Yes' : (p.hyvaThemeAvailable === false ? 'No' : '?')),
                    (p.hyvaCommerceAvailable === true ? 'Yes' : (p.hyvaCommerceAvailable === false ? 'No' : '?')),
                    name === config.activeProfile ? chalk.green('Yes') : 'No'
                ]);

                const headers = ['Name', 'Type', 'URL', 'B2B', 'Hyvä Theme', 'Hyvä Comm.', 'Active'];
                const termWidth = process.stdout.columns;

                if (termWidth) {
                    const visibleLength = (str) => {
                        return ('' + str).replace(/\u001b\[[0-9;]*m/g, '').length;
                    };

                    const colWidths = headers.map((h, i) => {
                        return Math.max(h.length, ...rows.map(r => visibleLength(r[i])));
                    });

                    const overhead = (headers.length * 3) + 1;
                    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + overhead;

                    if (totalWidth > termWidth) {
                        const available = termWidth - overhead;
                        // Indices: 0=Name, 1=Type, 2=URL, 3=B2B, 4=HT, 5=HC, 6=Active
                        const fixedIndices = [1, 3, 4, 5, 6];
                        const fixedWidth = fixedIndices.reduce((sum, i) => sum + colWidths[i], 0);

                        let fluidWidth = available - fixedWidth;
                        if (fluidWidth < 20) fluidWidth = 20;

                        const nameWidth = colWidths[0];
                        const urlWidth = colWidths[2];
                        let targetNameWidth = nameWidth;
                        let targetUrlWidth = urlWidth;

                        // Try to preserve Name, sacrifice URL
                        if (nameWidth + urlWidth > fluidWidth) {
                            // Keep Name as is if possible (assuming min URL width of 20)
                            if (nameWidth + 20 <= fluidWidth) {
                                targetUrlWidth = fluidWidth - nameWidth;
                                targetNameWidth = nameWidth;
                            } else {
                                // We have to cut Name too
                                // Give Name 30% or min 15
                                let w = Math.floor(fluidWidth * 0.3);
                                if (w < 15) w = 15;
                                targetNameWidth = Math.min(nameWidth, w);
                                targetUrlWidth = fluidWidth - targetNameWidth;
                            }
                        }

                        const truncate = (str, len) => {
                            if (!str) return str;
                            if (visibleLength(str) <= len) return str;
                            return str.substring(0, len - 3) + '...';
                        };

                        rows.forEach(row => {
                            row[0] = truncate(row[0], targetNameWidth);
                            row[2] = truncate(row[2], targetUrlWidth);
                        });
                    }
                }

                printTable(headers, rows);
            } catch (e) { handleError(e); }
        });


    //-------------------------------------------------------
    // "connection search" Command
    //-------------------------------------------------------
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


    //-------------------------------------------------------
    // "connection delete" Command
    //-------------------------------------------------------
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


    //-------------------------------------------------------
    // "connection edit" Command
    //-------------------------------------------------------
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


    //-------------------------------------------------------
    // "connection test" Command
    //-------------------------------------------------------
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

    //-------------------------------------------------------
    // "connection status" Command
    //-------------------------------------------------------
    connections.command('status')
        .description('Show current configuration status')
        .option('--format <format>', 'Output format (text, json)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run connection status
  $ mage-remote-run connection status --format json
`)
        .action(async (options) => {
            try {
                const config = await loadConfig();
                const activeProfileName = config.activeProfile;
                const activeProfile = activeProfileName ? config.profiles[activeProfileName] : null;
                if (activeProfile && await ensureProfileCapabilities(activeProfileName, activeProfile, config)) {
                    await saveConfig(config);
                }
                await printConnectionStatus(config, options);
            } catch (e) { handleError(e); }
        });


    //-------------------------------------------------------
    // "connection select" Command
    //-------------------------------------------------------
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

                if (process.env.DEBUG) {
                    console.log(chalk.gray(`DEBUG: Selected profile: ${selected}`));
                }

                config.activeProfile = selected;
                await saveConfig(config);

                await printConnectionStatus(config);
            } catch (e) { handleError(e); }
        });


    //-------------------------------------------------------
    // "connection clear-token-cache" Command
    //-------------------------------------------------------
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


    //-------------------------------------------------------
    // "connection status-header" Command
    //-------------------------------------------------------
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
            } catch (e) {
                handleError(e);
            }
        });
}
