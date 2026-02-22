import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
import search from '@inquirer/search';

function parseJsonOption(jsonString, fieldName) {
    if (!jsonString) return undefined;
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        throw new Error(`Invalid JSON for ${fieldName}: ${e.message}`);
    }
}

async function collectFields() {
    const fields = [];
    const addFields = await confirm({ message: 'Add webhook fields?', default: false });
    if (!addFields) return fields;

    let addMore = true;
    while (addMore) {
        const name = await input({ message: 'Field name:', validate: v => v ? true : 'Required' });
        const source = await input({ message: 'Field source:', validate: v => v ? true : 'Required' });
        fields.push({ name, source });
        addMore = await confirm({ message: 'Add another field?', default: false });
    }
    return fields;
}

async function collectHeaders() {
    const headers = [];
    const addHeaders = await confirm({ message: 'Add webhook headers?', default: false });
    if (!addHeaders) return headers;

    let addMore = true;
    while (addMore) {
        const name = await input({ message: 'Header name:', validate: v => v ? true : 'Required' });
        const value = await input({ message: 'Header value:', validate: v => v ? true : 'Required' });
        headers.push({ name, value });
        addMore = await confirm({ message: 'Add another header?', default: false });
    }
    return headers;
}

async function collectRules() {
    const rules = [];
    const addRules = await confirm({ message: 'Add webhook rules?', default: false });
    if (!addRules) return rules;

    let addMore = true;
    while (addMore) {
        const field = await input({ message: 'Rule field:', validate: v => v ? true : 'Required' });
        const operator = await select({
            message: 'Operator:',
            choices: [
                { name: 'Equals (eq)', value: 'eq' },
                { name: 'Not Equals (neq)', value: 'neq' },
                { name: 'Greater Than (gt)', value: 'gt' },
                { name: 'Less Than (lt)', value: 'lt' },
                { name: 'Greater or Equal (gte)', value: 'gte' },
                { name: 'Less or Equal (lte)', value: 'lte' }
            ]
        });
        const value = await input({ message: 'Rule value:', validate: v => v ? true : 'Required' });
        rules.push({ field, operator, value });
        addMore = await confirm({ message: 'Add another rule?', default: false });
    }
    return rules;
}

export async function listWebhooksAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

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
    } catch (e) {
        handleError(e);
    }
}

export async function supportedWebhooksAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';

        const data = await client.get('V1/webhooks/supportedList', {}, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }

        const rows = (Array.isArray(data) ? data : []).map(w => [w.name]);
        console.log(chalk.bold(`Total: ${rows.length}`));
        printTable(['Webhook Method'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showWebhookAction(name, options) {
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
                message: 'Select Webhook:',
                choices: items.map(w => ({
                    name: `${w.hook_name} (${w.webhook_type})`,
                    value: w.hook_name
                }))
            });
        }

        const webhook = items.find(w => w.hook_name === name);
        if (!webhook) throw new Error(`Webhook "${name}" not found.`);

        if (options.format === 'json') {
            console.log(JSON.stringify(webhook, null, 2));
            return;
        }
        if (options.format === 'xml') {
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
            ['Active', webhook.active === false ? 'No' : 'Yes']
        ];

        fields.forEach(([label, value]) => {
            console.log(`  ${chalk.bold((label + ':').padEnd(20))} ${value !== undefined && value !== null ? value : '-'}`);
        });
        console.log('');
    } catch (e) {
        if (e.name === 'ExitPromptError') return;
        handleError(e);
    }
}

export async function createWebhookAction(options) {
    try {
        const client = await createClient();

        const name = options.name || await input({ message: 'Hook Name:', validate: v => v ? true : 'Required' });

        let webhookMethod = options.webhookMethod;
        if (!webhookMethod) {
            let supportedTypes = [];
            try {
                const supportedData = await client.get('V1/webhooks/supportedList');
                supportedTypes = Array.isArray(supportedData) ? supportedData.map(w => w.name) : [];
            } catch {
                console.log(chalk.yellow('Warning: Could not fetch supported webhook types.'));
            }

            if (supportedTypes.length > 0) {
                const CUSTOM_OPTION = '-- Enter custom webhook method --';
                webhookMethod = await search({
                    message: 'Webhook Method:',
                    source: async term => {
                        const filtered = supportedTypes.filter(type =>
                            type.toLowerCase().includes((term || '').toLowerCase())
                        );
                        return [
                            { name: CUSTOM_OPTION, value: CUSTOM_OPTION },
                            ...filtered.map(type => ({ name: type, value: type }))
                        ];
                    }
                });

                if (webhookMethod === CUSTOM_OPTION) {
                    webhookMethod = await input({
                        message: 'Enter custom webhook method:',
                        validate: v => v ? true : 'Required'
                    });
                }
            } else {
                webhookMethod = await input({
                    message: 'Webhook Method (e.g., observer.catalog_product_save_after):',
                    validate: v => v ? true : 'Required'
                });
            }
        }

        const webhookType = options.webhookType || await select({
            message: 'Webhook Type:',
            choices: [
                { name: 'After', value: 'after' },
                { name: 'Before', value: 'before' }
            ],
            default: 'after'
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

        const batchName = options.batchName || await input({ message: 'Batch Name:', default: 'default' });
        const batchOrder = options.batchOrder || await input({ message: 'Batch Order:', default: '0', validate: v => !Number.isNaN(parseInt(v, 10)) || 'Must be a number' });
        const priority = options.priority || await input({ message: 'Priority:', default: '0', validate: v => !Number.isNaN(parseInt(v, 10)) || 'Must be a number' });
        const timeout = options.timeout || await input({ message: 'Timeout (ms):', default: '5000', validate: v => !Number.isNaN(parseInt(v, 10)) || 'Must be a number' });
        const softTimeout = options.softTimeout || await input({ message: 'Soft Timeout (ms):', default: '3000', validate: v => !Number.isNaN(parseInt(v, 10)) || 'Must be a number' });
        const ttl = options.ttl || await input({ message: 'Cache TTL:', default: '3600', validate: v => !Number.isNaN(parseInt(v, 10)) || 'Must be a number' });
        const fallbackErrorMessage = options.fallbackErrorMessage || await input({ message: 'Fallback Error Message:', default: 'Webhook execution failed' });

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

        let fields = parseJsonOption(options.fields, 'fields');
        let headers = parseJsonOption(options.headers, 'headers');
        let rules = parseJsonOption(options.rules, 'rules');

        const isInteractive = !options.name || !options.webhookMethod || !options.url;
        if (isInteractive) {
            if (!fields) fields = await collectFields();
            if (!headers) headers = await collectHeaders();
            if (!rules) rules = await collectRules();
        }

        const payload = {
            webhook: {
                hook_name: name,
                webhook_method: webhookMethod,
                webhook_type: webhookType,
                url,
                method,
                batch_name: batchName,
                batch_order: parseInt(batchOrder, 10),
                priority: parseInt(priority, 10),
                timeout: parseInt(timeout, 10),
                soft_timeout: parseInt(softTimeout, 10),
                ttl: parseInt(ttl, 10),
                fallback_error_message: fallbackErrorMessage,
                required: isRequired,
                fields: fields || [],
                headers: headers || [],
                rules: rules || []
            }
        };

        Object.keys(payload.webhook).forEach(key => payload.webhook[key] === undefined && delete payload.webhook[key]);
        await client.post('V1/webhooks/subscribe', payload);

        console.log(chalk.green(`\n✅ Webhook "${name}" created (subscribed) successfully!`));
    } catch (e) {
        if (e.name === 'ExitPromptError') return;
        handleError(e);
    }
}

export async function deleteWebhookAction(name) {
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

        await client.post('V1/webhooks/unsubscribe', { webhook });
        console.log(chalk.green(`\n✅ Webhook "${name}" deleted (unsubscribed) successfully.`));
    } catch (e) {
        if (e.name === 'ExitPromptError') return;
        handleError(e);
    }
}
