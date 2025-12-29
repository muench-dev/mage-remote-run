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

export { registerConnectionCommands };

export function registerCoreCommands(program) {
  registerWebsitesCommands(program);
  registerStoresCommands(program);
  registerCustomersCommands(program);
  registerOrdersCommands(program);
  registerEavCommands(program);
  registerProductsCommands(program);
  registerTaxCommands(program);
  registerInventoryCommands(program);
}

export function registerCloudCommands(program) {
  registerAdobeIoEventsCommands(program);
  registerCompanyCommands(program);
  registerWebhooksCommands(program);
}

export function registerAllCommands(program) {
  registerConnectionCommands(program);
  registerCoreCommands(program);
  registerCloudCommands(program);
}
