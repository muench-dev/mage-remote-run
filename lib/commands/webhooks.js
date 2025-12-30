import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
import search from '@inquirer/search';

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
    // "webhook supported-list" Command
    //-------------------------------------------------------
    webhooks.command('supported-list')
        .description('List supported webhook types')
        .option('--format <format>', 'Output format (table/json)', 'table')
        .action(async (options) => {
            try {
                const client = await createClient();

                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';

                const data = await client.get('V1/webhooks/supportedList', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }

                // Extract webhook names from the response
                const rows = (Array.isArray(data) ? data : []).map(w => [w.name]);

                console.log(chalk.bold(`Total: ${rows.length}`));
                printTable(['Webhook Method'], rows);
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
    // Helper Functions
    //-------------------------------------------------------

    /**
     * Parse JSON option string
     */
    function parseJsonOption(jsonString, fieldName) {
        if (!jsonString) return undefined;
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            throw new Error(`Invalid JSON for ${fieldName}: ${e.message}`);
        }
    }

    /**
     * Collect fields interactively
     */
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

    /**
     * Collect headers interactively
     */
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

    /**
     * Collect rules interactively
     */
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

    //-------------------------------------------------------
    // "webhook create" Command
    //-------------------------------------------------------
    webhooks.command('create')
        .description('Subscribe to a new webhook')
        .option('--name <name>', 'Hook Name')
        .option('--webhook-method <method>', 'Webhook Method (e.g., observer.catalog_product_save_after)')
        .option('--webhook-type <type>', 'Webhook Type (before/after)')
        .option('--url <url>', 'Webhook URL')
        .option('--method <method>', 'HTTP Method (POST/PUT/DELETE)')
        .option('--batch-name <name>', 'Batch Name')
        .option('--batch-order <n>', 'Batch Order')
        .option('--priority <n>', 'Priority')
        .option('--timeout <n>', 'Timeout in milliseconds')
        .option('--soft-timeout <n>', 'Soft Timeout in milliseconds')
        .option('--ttl <n>', 'Cache TTL')
        .option('--fallback-error-message <msg>', 'Fallback Error Message')
        .option('--required', 'Required')
        .option('--fields <json>', 'Fields as JSON string')
        .option('--headers <json>', 'Headers as JSON string')
        .option('--rules <json>', 'Rules as JSON string')
        .addHelpText('after', `
Examples:
  # Interactive mode
  $ mage-remote-run webhook create

  # Create with all options
  $ mage-remote-run webhook create \\
      --name "Product Save Hook" \\
      --webhook-method "observer.catalog_product_save_after" \\
      --webhook-type "after" \\
      --url https://example.com/webhook \\
      --method POST \\
      --timeout 5000 \\
      --soft-timeout 3000 \\
      --ttl 3600

  # Create with fields, headers, and rules
  $ mage-remote-run webhook create \\
      --name "Order Complete" \\
      --webhook-method "observer.sales_order_save_after" \\
      --webhook-type "after" \\
      --url https://example.com/orders \\
      --fields '[{"name":"order_id","source":"order.entity_id"}]' \\
      --headers '[{"name":"X-Auth","value":"token123"}]' \\
      --rules '[{"field":"order.status","operator":"eq","value":"complete"}]'
        `)
        .action(async (options) => {
            try {
                const client = await createClient();

                const name = options.name || await input({ message: 'Hook Name:', validate: v => v ? true : 'Required' });

                let webhookMethod = options.webhookMethod;
                if (!webhookMethod) {
                    // Fetch supported webhook types for interactive selection
                    let supportedTypes = [];
                    try {
                        const supportedData = await client.get('V1/webhooks/supportedList');
                        supportedTypes = Array.isArray(supportedData) ? supportedData.map(w => w.name) : [];
                    } catch (e) {
                        // If fetching fails, continue without suggestions
                        console.log(chalk.yellow('Warning: Could not fetch supported webhook types.'));
                    }

                    if (supportedTypes.length > 0) {
                        // Add custom option at the top
                        const CUSTOM_OPTION = '-- Enter custom webhook method --';

                        webhookMethod = await search({
                            message: 'Webhook Method:',
                            source: async (term) => {
                                const filtered = supportedTypes.filter(type =>
                                    type.toLowerCase().includes((term || '').toLowerCase())
                                );
                                return [
                                    { name: CUSTOM_OPTION, value: CUSTOM_OPTION },
                                    ...filtered.map(type => ({ name: type, value: type }))
                                ];
                            }
                        });

                        // If custom option selected, prompt for manual input
                        if (webhookMethod === CUSTOM_OPTION) {
                            webhookMethod = await input({
                                message: 'Enter custom webhook method:',
                                validate: v => v ? true : 'Required'
                            });
                        }
                    } else {
                        // Fallback to regular input if no supported types available
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

                // Batch name with default
                const batchName = options.batchName || await input({
                    message: 'Batch Name:',
                    default: 'default'
                });

                // Batch order with default
                const batchOrder = options.batchOrder || await input({
                    message: 'Batch Order:',
                    default: '0',
                    validate: v => !isNaN(parseInt(v)) || 'Must be a number'
                });

                // Priority with default
                const priority = options.priority || await input({
                    message: 'Priority:',
                    default: '0',
                    validate: v => !isNaN(parseInt(v)) || 'Must be a number'
                });

                // Timeout with default
                const timeout = options.timeout || await input({
                    message: 'Timeout (ms):',
                    default: '5000',
                    validate: v => !isNaN(parseInt(v)) || 'Must be a number'
                });

                // Soft timeout with default
                const softTimeout = options.softTimeout || await input({
                    message: 'Soft Timeout (ms):',
                    default: '3000',
                    validate: v => !isNaN(parseInt(v)) || 'Must be a number'
                });

                // TTL with default
                const ttl = options.ttl || await input({
                    message: 'Cache TTL:',
                    default: '3600',
                    validate: v => !isNaN(parseInt(v)) || 'Must be a number'
                });

                // Fallback error message
                const fallbackErrorMessage = options.fallbackErrorMessage || await input({
                    message: 'Fallback Error Message:',
                    default: 'Webhook execution failed'
                });

                // Check if 'required' is explicitly passed
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

                // Parse or collect fields, headers, rules
                let fields = parseJsonOption(options.fields, 'fields');
                let headers = parseJsonOption(options.headers, 'headers');
                let rules = parseJsonOption(options.rules, 'rules');

                // If not provided via options and we're in interactive mode, collect them
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
                        url: url,
                        method: method,
                        batch_name: batchName,
                        batch_order: parseInt(batchOrder),
                        priority: parseInt(priority),
                        timeout: parseInt(timeout),
                        soft_timeout: parseInt(softTimeout),
                        ttl: parseInt(ttl),
                        fallback_error_message: fallbackErrorMessage,
                        required: isRequired,
                        fields: fields || [],
                        headers: headers || [],
                        rules: rules || []
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
