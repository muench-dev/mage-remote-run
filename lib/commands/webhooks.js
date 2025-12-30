import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';

export function registerWebhooksCommands(program) {
    const webhooks = program.command('webhook').description('Manage webhooks (SaaS)');

    //-------------------------------------------------------
    // "webhook list" Command
    //-------------------------------------------------------
    webhooks.command('list')
        .description('List available webhooks')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                // SaaS API returns an array directly
                const data = await client.get('V1/webhooks/list', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                const rows = (Array.isArray(data) ? data : []).map(w => [
                    w.hook_name,
                    w.webhook_type,
                    w.method,
                    w.priority !== undefined ? w.priority : '-',
                    w.url
                ]);

                console.log(chalk.bold(`Total: ${rows.length}`));
                printTable(['Name', 'Type', 'Method', 'Priority', 'URL'], rows);
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "webhook show" Command
    //-------------------------------------------------------
    webhooks.command('show')
        .description('Get webhook details')
        .argument('[name]', 'Webhook Name')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (name, options) => {
            try {
                const client = await createClient();

                // Always fetch list first as there is no direct "get by name" endpoint in swagger
                const listData = await client.get('V1/webhooks/list');
                const items = Array.isArray(listData) ? listData : [];

                if (!name) {
                    if (items.length === 0) {
                        console.log(chalk.yellow('No webhooks found.'));
                        return;
                    }
                    name = await select({
                        message: 'Select Webhook:',
                        choices: items.map(w => ({
                            name: `${w.hook_name} (${w.webhook_type})`,
                            value: w.hook_name
                        }))
                    });
                }

                const webhook = items.find(w => w.hook_name === name);

                if (!webhook) {
                    throw new Error(`Webhook "${name}" not found.`);
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(webhook, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    // Primitive XML conversion if needed, but JSON is standard
                    console.log(webhook);
                    return;
                }

                console.log(chalk.bold.blue('\nℹ️  Webhook Details'));
                console.log(chalk.gray('━'.repeat(60)));

                const fields = [
                    ['Name', webhook.hook_name],
                    ['Type', webhook.webhook_type],
                    ['URL', webhook.url],
                    ['Method', webhook.method],
                    ['Priority', webhook.priority],
                    ['Batch Name', webhook.batch_name],
                    ['Batch Order', webhook.batch_order],
                    ['Timeout', webhook.timeout],
                    ['Soft Timeout', webhook.soft_timeout],
                    ['Required', webhook.required ? 'Yes' : 'No'],
                    ['Active', webhook.active === false ? 'No' : 'Yes'] // Assuming default true if undefined
                ];

                fields.forEach(([label, value]) => {
                    console.log(`  ${chalk.bold((label + ':').padEnd(20))} ${value !== undefined && value !== null ? value : '-'}`);
                });
                console.log('');

            } catch (e) {
                if (e.name === 'ExitPromptError') return;
                handleError(e);
            }
        });

    //-------------------------------------------------------
    // "webhook create" Command
    //-------------------------------------------------------
    webhooks.command('create')
        .description('Subscribe to a new webhook')
        .option('--name <name>', 'Hook Name')
        .option('--type <type>', 'Webhook Type')
        .option('--url <url>', 'Webhook URL')
        .option('--method <method>', 'Method (msg_mq, etc.)')
        .option('--batch-name <name>', 'Batch Name')
        .option('--batch-order <n>', 'Batch Order')
        .option('--priority <n>', 'Priority')
        .option('--timeout <n>', 'Timeout')
        .option('--soft-timeout <n>', 'Soft Timeout')
        .option('--required', 'Required')
        .action(async (options) => {
            try {
                const client = await createClient();

                const name = options.name || await input({ message: 'Hook Name:', validate: v => v ? true : 'Required' });

                const type = options.type || await select({
                    message: 'Webhook Type:',
                    choices: [
                        { name: 'Observer', value: 'observer' },
                        { name: 'Plugin', value: 'plugin' }
                    ]
                });

                const url = options.url || await input({ message: 'Webhook URL:', validate: v => v ? true : 'Required' });

                const method = options.method || await select({
                    message: 'HTTP Method:',
                    choices: [
                        { name: 'POST', value: 'POST' },
                        { name: 'PUT', value: 'PUT' },
                        { name: 'DELETE', value: 'DELETE' }
                    ],
                    default: 'POST'
                });

                // Check if 'required' is explicitly passed as boolean true/false in options
                // If checking existence of flag, commander sets it to true if present.
                // But if not present, it's undefined.
                // We want to ask if it's undefined.
                let isRequired = options.required;
                if (isRequired === undefined) {
                    isRequired = await select({
                        message: 'Is Required?',
                        choices: [
                            { name: 'No', value: false },
                            { name: 'Yes', value: true }
                        ],
                        default: false
                    });
                }

                const payload = {
                    webhook: {
                        hook_name: name,
                        webhook_type: type,
                        url: url,
                        method: method,
                        batch_name: options.batchName,
                        batch_order: options.batchOrder ? parseInt(options.batchOrder) : undefined,
                        priority: options.priority ? parseInt(options.priority) : undefined,
                        timeout: options.timeout ? parseInt(options.timeout) : undefined,
                        soft_timeout: options.softTimeout ? parseInt(options.softTimeout) : undefined,
                        required: isRequired
                    }
                };

                // Filter undefined
                Object.keys(payload.webhook).forEach(key => payload.webhook[key] === undefined && delete payload.webhook[key]);

                await client.post('V1/webhooks/subscribe', payload);

                console.log(chalk.green(`\n✅ Webhook "${name}" created (subscribed) successfully!`));
            } catch (e) {
                if (e.name === 'ExitPromptError') return;
                handleError(e);
            }
        });

    //-------------------------------------------------------
    // "webhook delete" Command
    //-------------------------------------------------------
    webhooks.command('delete')
        .description('Unsubscribe from a webhook')
        .argument('[name]', 'Webhook Name')
        .action(async (name) => {
            try {
                const client = await createClient();

                const listData = await client.get('V1/webhooks/list');
                const items = Array.isArray(listData) ? listData : [];

                if (!name) {
                    if (items.length === 0) {
                        console.log(chalk.yellow('No webhooks found.'));
                        return;
                    }
                    name = await select({
                        message: 'Select Webhook to Delete:',
                        choices: items.map(w => ({
                            name: `${w.hook_name} (${w.webhook_type})`,
                            value: w.hook_name
                        }))
                    });
                }

                const webhook = items.find(w => w.hook_name === name);
                if (!webhook) throw new Error(`Webhook "${name}" not found.`);

                const shouldDelete = await confirm({ message: `Are you sure you want to delete webhook "${name}"?`, default: false });
                if (!shouldDelete) return;

                // Unsubscribe requires sending the webhook object wrapper
                await client.post('V1/webhooks/unsubscribe', { webhook });
                console.log(chalk.green(`\n✅ Webhook "${name}" deleted (unsubscribed) successfully.`));
            } catch (e) {
                if (e.name === 'ExitPromptError') return;
                handleError(e);
            }
        });
}
