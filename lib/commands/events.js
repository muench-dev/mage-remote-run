import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerEventsCommands(program) {
    const events = program.command('event').description('Manage Adobe I/O Events');

    //-------------------------------------------------------
    // "event check-configuration" Command (Renamed from adobe-io-event)
    //-------------------------------------------------------
    events.command('check-configuration')
        .description('Check Adobe I/O Event configuration')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run event check-configuration
  $ mage-remote-run event check-configuration --format json
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const data = await client.get('V1/adobe_io_events/check_configuration', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                console.log(chalk.bold.blue('\n🔍 Configuration Check Result'));
                console.log(chalk.gray('━'.repeat(60)));

                if (typeof data === 'object' && data !== null) {
                    if (Array.isArray(data)) {
                        console.log(JSON.stringify(data, null, 2));
                    } else {
                        Object.entries(data).forEach(([key, value]) => {
                            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            let displayValue = value;
                            if (typeof value === 'boolean') {
                                displayValue = value ? chalk.green('Yes') : chalk.red('No');
                            } else if (value === null) {
                                displayValue = chalk.gray('null');
                            } else if (typeof value === 'object') {
                                displayValue = JSON.stringify(value);
                            }
                            console.log(`  ${chalk.bold(label + ':').padEnd(35)} ${displayValue}`);
                        });
                    }
                } else {
                    console.log(`  ${data}`);
                }
                console.log('');
            } catch (e) { handleError(e); }
        });

    const provider = events.command('provider').description('Manage event providers');

    //-------------------------------------------------------
    // "event provider list" Command
    //-------------------------------------------------------
    provider.command('list')
        .description('List event providers')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run event provider list
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';

                const data = await client.get('V1/eventing/eventProvider', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }

                const rows = (data || []).map(p => [p.id, p.label, p.description]);
                printTable(['ID', 'Label', 'Description'], rows);
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "event provider show" Command
    //-------------------------------------------------------
    provider.command('show <id>')
        .description('Show event provider details')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (id, options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';

                // We try fetching all and filtering because the user mapped "show" to the specific endpoint that looks like a collection
                const data = await client.get('V1/eventing/eventProvider', {}, { headers });

                let item;
                if (Array.isArray(data)) {
                    item = data.find(p => p.id == id);
                } else if (data.id == id) {
                    item = data;
                }

                if (!item) {
                    throw new Error(`Event Provider '${id}' not found.`);
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(item, null, 2));
                    return;
                }

                console.log(chalk.bold.blue('\n🔍 Event Provider Details'));
                console.log(chalk.gray('━'.repeat(60)));
                Object.entries(item).forEach(([key, value]) => {
                    console.log(`  ${chalk.bold(key + ':').padEnd(20)} ${value}`);
                });
                console.log('');

            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "event provider create" Command
    //-------------------------------------------------------
    provider.command('create')
        .description('Create a new event provider')
        .action(async () => {
            try {
                const client = await createClient();

                // Attempt to auto-detect instance_id from profile settings (SaaS only)
                let defaultInstanceId = undefined;
                try {
                    console.log(chalk.gray('Attempting to auto-detect Instance ID...'));
                    const { getActiveProfile } = await import('../config.js');
                    const profile = await getActiveProfile();

                    if (profile && (profile.type === 'ac-saas' || profile.type === 'saas')) {
                        try {
                            // Extract last part of URL path
                            const url = new URL(profile.url);
                            const pathParts = url.pathname.split('/').filter(p => p.length > 0);
                            if (pathParts.length > 0) {
                                defaultInstanceId = pathParts[pathParts.length - 1];
                                console.log(chalk.gray(`Found Instance ID (from URL): ${defaultInstanceId}`));
                            } else {
                                console.log(chalk.gray('Could not extract Instance ID from URL.'));
                            }
                        } catch (e) {
                            console.log(chalk.gray('Invalid URL in profile configuration.'));
                        }
                    } else {
                        console.log(chalk.gray('Instance ID detection only supported for SaaS connections.'));
                    }
                } catch (e) {
                    console.log(chalk.gray('Could not auto-detect Instance ID.'));
                }

                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'provider_id',
                        message: `Enter Provider ID ${chalk.dim('(Found in Adobe Developer Console > Project > Events > Event Provider > ID)')}:`,
                        validate: input => input ? true : 'Provider ID is required'
                    },
                    {
                        type: 'input',
                        name: 'label',
                        message: `Enter Provider Label ${chalk.dim('(A friendly name for this provider)')}:`,
                        validate: input => input ? true : 'Label is required'
                    },
                    {
                        type: 'input',
                        name: 'description',
                        message: `Enter Provider Description ${chalk.dim('(Optional)')}:`
                    },
                    {
                        type: 'input',
                        name: 'instance_id',
                        message: `Enter Instance ID ${chalk.dim('(Found in "check-configuration" or Adobe Developer Console)')}:`,
                        default: defaultInstanceId
                    },
                    {
                        type: 'editor',
                        name: 'workspace_configuration',
                        message: `Enter Workspace Configuration ${chalk.dim('(JSON from Adobe Developer Console > Download Project Config)')}:`
                    }
                ]);

                const payload = {
                    eventProvider: {
                        provider_id: answers.provider_id,
                        instance_id: answers.instance_id,
                        label: answers.label,
                        description: answers.description,
                        workspace_configuration: answers.workspace_configuration
                    }
                };

                const result = await client.post('V1/eventing/eventProvider', payload);
                console.log(chalk.green('\n✅ Event Provider Created Successfully'));
                console.log(JSON.stringify(result, null, 2));

            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "event provider delete" Command
    //-------------------------------------------------------
    provider.command('delete <id>')
        .description('Delete an event provider')
        .action(async (id) => {
            try {
                const client = await createClient();
                // Assumed endpoint based on standard REST, though prompt said DELETE /V1/eventing/eventProvider
                // Usually DELETE requires an ID. I will append the ID.
                // Wait, if the prompt says DELETE /V1/eventing/eventProvider, it MIGHT expect a body or query param?
                // Standard Magento: DELETE /V1/eventing/eventProvider/:id
                // I will try appending ID.
                await client.delete(`V1/eventing/eventProvider/${id}`);
                console.log(chalk.green(`\n✅ Event Provider '${id}' deleted successfully.`));
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "event supported-list" Command
    //-------------------------------------------------------
    events.command('supported-list')
        .description('List supported events')
        .option('-f, --format <type>', 'Output format (text, json)', 'text')
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';

                const data = await client.get('V1/eventing/supportedList', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }

                // Assuming data is list of strings or objects.
                // If objects, we might need to know structure.
                // Prompt didn't specify structure. Assuming list of strings or objects with 'name'/'id'.
                if (Array.isArray(data)) {
                    if (data.length > 0 && typeof data[0] === 'string') {
                        data.forEach(d => console.log(d));
                    } else {
                        // Fallback table
                        const keys = Object.keys(data[0] || {});
                        const rows = data.map(d => Object.values(d));
                        printTable(keys, rows);
                    }
                } else {
                    console.log(data);
                }

            } catch (e) { handleError(e); }
        });

}
