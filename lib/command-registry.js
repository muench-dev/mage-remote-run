import { registerWebsitesCommands } from './commands/websites.js';
import { registerStoresCommands } from './commands/stores.js';
import { registerConnectionCommands } from './commands/connections.js';
import { registerCustomersCommands } from './commands/customers.js';
import { registerOrdersCommands } from './commands/orders.js';
import { registerEavCommands } from './commands/eav.js';
import { registerProductsCommands } from './commands/products.js';
import { registerCompanyCommands } from './commands/company.js';
import { registerCartCommands } from './commands/cart.js';
import { registerTaxCommands } from './commands/tax.js';
import { registerInventoryCommands } from './commands/inventory.js';
import { registerEventsCommands } from './commands/events.js';
import { registerWebhooksCommands } from './commands/webhooks.js';
import { registerPurchaseOrderCartCommands } from './commands/purchase-order-cart.js';
import { registerImportCommands } from './commands/import.js';
import { registerModulesCommands } from './commands/modules.js';
import { registerConsoleCommand } from './commands/console.js';
import { registerShipmentCommands } from './commands/shipments.js';
import { registerRestCommands } from './commands/rest.js';
import { registerPluginsCommands } from './commands/plugins.js';

export { registerConnectionCommands, registerConsoleCommand, registerShipmentCommands, registerRestCommands, registerPluginsCommands };

const GROUPS = {
  CORE: [
    registerWebsitesCommands,
    registerStoresCommands,
    registerCustomersCommands,
    registerOrdersCommands,
    registerEavCommands,
    registerProductsCommands,
    registerCartCommands,
    registerTaxCommands,
    registerInventoryCommands,
    registerShipmentCommands,
    registerConsoleCommand,
    registerRestCommands,
    registerPluginsCommands
  ],
  COMMERCE: [
    registerCompanyCommands,
    registerPurchaseOrderCartCommands
  ],
  CLOUD: [
    registerEventsCommands,
    registerWebhooksCommands
  ],
  IMPORT: [
    registerImportCommands
  ],
  MODULES: [
    registerModulesCommands
  ]
};

const TYPE_MAPPINGS = {
  'magento-os': [...GROUPS.CORE, ...GROUPS.MODULES],
  'mage-os': [...GROUPS.CORE, ...GROUPS.MODULES],
  'ac-on-prem': [...GROUPS.CORE, ...GROUPS.COMMERCE, ...GROUPS.IMPORT, ...GROUPS.MODULES],
  'ac-cloud-paas': [...GROUPS.CORE, ...GROUPS.COMMERCE, ...GROUPS.CLOUD, ...GROUPS.IMPORT, ...GROUPS.MODULES],
  'ac-saas': [...GROUPS.CORE, ...GROUPS.COMMERCE, ...GROUPS.CLOUD, ...GROUPS.IMPORT] // Assuming SaaS has same feature set as PaaS for CLI
};

const B2B_COMMANDS = new Set([registerCompanyCommands, registerPurchaseOrderCartCommands]);
const B2B_CHECK_TYPES = new Set(['ac-on-prem', 'ac-cloud-paas']);

function shouldRegisterCommandForProfile(registrar, profile) {
  if (!B2B_COMMANDS.has(registrar)) {
    return true;
  }
  if (!profile || !profile.type) {
    return false;
  }
  if (!B2B_CHECK_TYPES.has(profile.type)) {
    return true;
  }
  return profile.b2bModulesAvailable === true;
}

export function registerCoreCommands(program) {
  // Backward compatibility: Register CORE group
  GROUPS.CORE.forEach(registrar => registrar(program));
}

export function registerCloudCommands(program, profile = null) {
  // Backward compatibility
  [...GROUPS.COMMERCE, ...GROUPS.CLOUD, ...GROUPS.IMPORT]
    .filter(registrar => shouldRegisterCommandForProfile(registrar, profile))
    .forEach(registrar => registrar(program, profile));
}

// Deprecated: Use registerCommands instead
export function registerAllCommands(program) {
  registerConnectionCommands(program);
  const all = new Set([...GROUPS.CORE, ...GROUPS.COMMERCE, ...GROUPS.CLOUD, ...GROUPS.IMPORT]);
  all.forEach(registrar => registrar(program));
}

export const registerCommands = (program, profile) => {
  registerConnectionCommands(program);

  if (profile && profile.type) {
    const registrars = TYPE_MAPPINGS[profile.type];
    if (registrars) {
      registrars
        .filter(registrar => shouldRegisterCommandForProfile(registrar, profile))
        .forEach(registrar => registrar(program, profile));
    } else {
      // Fallback for unknown types
      GROUPS.CORE.forEach(registrar => registrar(program));
    }
  }
};
