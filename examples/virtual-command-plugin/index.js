/**
 * Example Plugin: Dynamic Virtual Command Registration
 *
 * This plugin shows how to register virtual commands in JavaScript at runtime.
 * Commands defined here are equivalent to entries in mage-remote-run.json — choose
 * whichever approach fits your use-case:
 *
 *   - mage-remote-run.json  →  simple, no logic required
 *   - index.js              →  when you need conditions, loops, or runtime data
 *
 * @param {Object} context
 * @param {Object} context.config - The user configuration object
 * @param {Object} context.lib   - Built-in utilities (utils, commandHelper, config)
 */
export default async function(context) {
    const { config } = context;

    if (!config.commands) {
        config.commands = [];
    }

    /**
     * Demonstrates choices (object form) combined with a JSON body template.
     *
     * When --status is omitted the CLI shows an interactive select prompt:
     *
     *   ? Product status  (Use arrow keys)
     *   ❯ Enabled
     *     Disabled
     *
     * Usage:
     *   mage-remote-run example virtual set-product-status --sku SHIRT-M --status 1
     *   mage-remote-run example virtual set-product-status --sku SHIRT-M   # prompts
     */
    config.commands.push({
        name: 'example virtual set-product-status',
        method: 'PUT',
        endpoint: '/:storeId/V1/products/:sku',
        description: 'Enable or disable a product. When --status is omitted an interactive prompt appears.',
        summary: 'PUT /V1/products/:sku — status via choices prompt',
        supports_filters: false,
        connection_types: ['magento-os', 'mage-os', 'ac-on-prem', 'ac-cloud-paas'],
        body: {
            product: {
                sku:    '${sku}',
                status: '${status}'
            }
        },
        options: {
            storeId: {
                type:        'string',
                required:    false,
                default:     'all',
                description: 'Store view code (e.g., all, default)'
            },
            sku: {
                type:        'string',
                required:    true,
                description: 'Product SKU to update'
            },
            status: {
                type:        'string',
                required:    true,
                description: 'Product status',
                choices: [
                    { name: 'Enabled',  value: '1' },
                    { name: 'Disabled', value: '2' }
                ]
            }
        }
    });
}
