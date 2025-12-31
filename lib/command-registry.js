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
import { registerEventsCommands } from './commands/events.js';
import { registerWebhooksCommands } from './commands/webhooks.js';
import { registerPurchaseOrderCartCommands } from './commands/purchase-order-cart.js';
import { registerConsoleCommand } from './commands/console.js';

export { registerConnectionCommands, registerConsoleCommand };

export function registerCoreCommands(program) {
  registerWebsitesCommands(program);
  registerStoresCommands(program);
  registerCustomersCommands(program);
  registerOrdersCommands(program);
  registerEavCommands(program);
  registerProductsCommands(program);
  registerTaxCommands(program);
  registerInventoryCommands(program);
  registerConsoleCommand(program);
}

export function registerCloudCommands(program) {
  registerEventsCommands(program);
  registerCompanyCommands(program);
  registerPurchaseOrderCartCommands(program);
  registerWebhooksCommands(program);
}

export function registerAllCommands(program) {
  registerConnectionCommands(program);
  registerCoreCommands(program);
  registerCloudCommands(program);
}

// Alias for backwards compatibility with console.js (and potential other usages)
export const registerCommands = (program, profile) => {
  // Note: console.js passes profile, but registerAllCommands doesn't strictly use it 
  // (it registers everything, profile checks happen inside or via selective registration).
  // The original behavior in console.js:
  // const profile = await getActiveProfile();
  // registerCommands(localProgram, profile);

  // In bin/mage-remote-run.js old logic:
  // registerConnectionCommands(program);
  // if (profile) { registerWebsitesCommands... }

  // We should replicate that 'selective' registration if we want to match exact behavior?
  // BUT console.js wants to register ALL available commands for the profile.

  registerConnectionCommands(program);

  // Simple logic: If profile exists, register all. 
  // console.js usage implies profile is present if it's running (or it tries to get it).

  if (profile) {
    registerCoreCommands(program);
    // Cloud check
    if (profile.type === 'ac-cloud-paas' || profile.type === 'ac-saas') {
      registerCloudCommands(program);
    }
  }
};
