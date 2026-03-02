import {
    createWebhookAction,
    deleteWebhookAction,
    listWebhooksAction,
    showWebhookAction,
    supportedWebhooksAction
} from './webhooks-actions.js';
import { addFormatOption } from '../utils.js';

export function registerWebhooksCommands(program) {
    const webhooks = program.command('webhook').description('Manage webhooks (SaaS)');

    addFormatOption(webhooks.command('list')
        .description('List available webhooks'))
        .action(listWebhooksAction);

    addFormatOption(webhooks.command('supported-list')
        .description('List supported webhook types'))
        .action(supportedWebhooksAction);

    addFormatOption(webhooks.command('show')
        .description('Get webhook details')
        .argument('[name]', 'Webhook Name'))
        .action(showWebhookAction);

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
        .action(createWebhookAction);

    webhooks.command('delete')
        .description('Unsubscribe from a webhook')
        .argument('[name]', 'Webhook Name')
        .action(deleteWebhookAction);
}
