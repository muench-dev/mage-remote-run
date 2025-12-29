import { registerWebsitesCommands } from './commands/websites.js';
import { registerStoresCommands } from './commands/stores.js';
import { registerConnectionCommands } from './commands/connections.js';
import { registerCustomersCommands } from './commands/customers.js';
import { registerOrdersCommands } from './commands/orders.js';
import { registerEavCommands } from './commands/eav.js';
import { registerProductsCommands } from './commands/products.js';
import { registerCompanyCommands } from './commands/company.js';
import { registerTaxCommands } from './commands/tax.js';
import { registerInventoryCommands } from './commands/inventory.js';
import { registerAdobeIoEventsCommands } from './commands/adobe-io-events.js';
import { registerWebhooksCommands } from './commands/webhooks.js';
import { registerConsoleCommand } from './commands/console.js';

export function registerCommands(program, profile) {
    registerConnectionCommands(program);
    registerConsoleCommand(program);

    if (profile) {
        registerWebsitesCommands(program);
        registerStoresCommands(program);
        registerCustomersCommands(program);
        registerOrdersCommands(program);
        registerEavCommands(program);
        registerProductsCommands(program);
        registerTaxCommands(program);
        registerInventoryCommands(program);

        if (profile.type === 'ac-cloud-paas' || profile.type === 'ac-saas') {
            registerAdobeIoEventsCommands(program);
            registerCompanyCommands(program);
            registerWebhooksCommands(program);
        }
    }
}
