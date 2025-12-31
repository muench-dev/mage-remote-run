
import { jest } from '@jest/globals';

// Mocks for all registrar functions
const registrars = {
    registerWebsitesCommands: jest.fn(),
    registerStoresCommands: jest.fn(),
    registerCustomersCommands: jest.fn(),
    registerOrdersCommands: jest.fn(),
    registerEavCommands: jest.fn(),
    registerProductsCommands: jest.fn(),
    registerCompanyCommands: jest.fn(),
    registerTaxCommands: jest.fn(),
    registerInventoryCommands: jest.fn(),
    registerEventsCommands: jest.fn(),
    registerWebhooksCommands: jest.fn(),
    registerPurchaseOrderCartCommands: jest.fn(),
    registerImportCommands: jest.fn(),
    registerConsoleCommand: jest.fn(),
    registerConnectionCommands: jest.fn(),
    registerCartCommands: jest.fn()
};

// Mock individual modules
jest.unstable_mockModule('../lib/commands/websites.js', () => ({ registerWebsitesCommands: registrars.registerWebsitesCommands }));
jest.unstable_mockModule('../lib/commands/stores.js', () => ({ registerStoresCommands: registrars.registerStoresCommands }));
jest.unstable_mockModule('../lib/commands/connections.js', () => ({ registerConnectionCommands: registrars.registerConnectionCommands }));
jest.unstable_mockModule('../lib/commands/customers.js', () => ({ registerCustomersCommands: registrars.registerCustomersCommands }));
jest.unstable_mockModule('../lib/commands/orders.js', () => ({ registerOrdersCommands: registrars.registerOrdersCommands }));
jest.unstable_mockModule('../lib/commands/eav.js', () => ({ registerEavCommands: registrars.registerEavCommands }));
jest.unstable_mockModule('../lib/commands/products.js', () => ({ registerProductsCommands: registrars.registerProductsCommands }));
jest.unstable_mockModule('../lib/commands/company.js', () => ({ registerCompanyCommands: registrars.registerCompanyCommands }));
jest.unstable_mockModule('../lib/commands/tax.js', () => ({ registerTaxCommands: registrars.registerTaxCommands }));
jest.unstable_mockModule('../lib/commands/inventory.js', () => ({ registerInventoryCommands: registrars.registerInventoryCommands }));
jest.unstable_mockModule('../lib/commands/events.js', () => ({ registerEventsCommands: registrars.registerEventsCommands }));
jest.unstable_mockModule('../lib/commands/webhooks.js', () => ({ registerWebhooksCommands: registrars.registerWebhooksCommands }));
jest.unstable_mockModule('../lib/commands/purchase-order-cart.js', () => ({ registerPurchaseOrderCartCommands: registrars.registerPurchaseOrderCartCommands }));
jest.unstable_mockModule('../lib/commands/import.js', () => ({ registerImportCommands: registrars.registerImportCommands }));
jest.unstable_mockModule('../lib/commands/console.js', () => ({ registerConsoleCommand: registrars.registerConsoleCommand }));
jest.unstable_mockModule('../lib/commands/cart.js', () => ({ registerCartCommands: registrars.registerCartCommands }));

const { registerCommands } = await import('../lib/command-registry.js');

describe('Command Registry', () => {
    let program;

    beforeEach(() => {
        program = { command: jest.fn().mockReturnThis() }; // Mock commander program
        jest.clearAllMocks();
    });

    // Helper to verify core commands
    const expectCoreCommands = () => {
        // Core commands are typically called with (program) or (program, profile) now?
        // Our updated code calls registrar(program, profile).
        // Standard core commands normally ignore the second arg.
        // We just need to check they were called.
        expect(registrars.registerConnectionCommands).toHaveBeenCalled();
        expect(registrars.registerWebsitesCommands).toHaveBeenCalled();
        expect(registrars.registerStoresCommands).toHaveBeenCalled();
        expect(registrars.registerCustomersCommands).toHaveBeenCalled();
        expect(registrars.registerOrdersCommands).toHaveBeenCalled();
        expect(registrars.registerEavCommands).toHaveBeenCalled();
        expect(registrars.registerProductsCommands).toHaveBeenCalled();
        expect(registrars.registerTaxCommands).toHaveBeenCalled();
        expect(registrars.registerCartCommands).toHaveBeenCalled();
        expect(registrars.registerInventoryCommands).toHaveBeenCalled();
        expect(registrars.registerConsoleCommand).toHaveBeenCalled();
    };

    test('registers only connection commands if no profile', () => {
        registerCommands(program, null);
        expect(registrars.registerConnectionCommands).toHaveBeenCalledWith(program);
        expect(registrars.registerWebsitesCommands).not.toHaveBeenCalled();
    });

    test('magento-os: registers core commands only', () => {
        const profile = { type: 'magento-os' };
        registerCommands(program, profile);
        expectCoreCommands();
        expect(registrars.registerCompanyCommands).not.toHaveBeenCalled();
        expect(registrars.registerEventsCommands).not.toHaveBeenCalled();
        expect(registrars.registerWebhooksCommands).not.toHaveBeenCalled();
        expect(registrars.registerImportCommands).not.toHaveBeenCalled();
    });

    test('mage-os: registers core commands only', () => {
        const profile = { type: 'mage-os' };
        registerCommands(program, profile);
        expectCoreCommands();
        expect(registrars.registerCompanyCommands).not.toHaveBeenCalled();
    });

    test('ac-on-prem: registers core + commerce + import', () => {
        const profile = { type: 'ac-on-prem' };
        registerCommands(program, profile);
        expectCoreCommands();

        // Adobe Commerce specific
        expect(registrars.registerCompanyCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerPurchaseOrderCartCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerImportCommands).toHaveBeenCalledWith(program, profile);

        // Cloud specific - should NOT be called
        expect(registrars.registerEventsCommands).not.toHaveBeenCalled();
        expect(registrars.registerWebhooksCommands).not.toHaveBeenCalled();
    });

    test('ac-cloud-paas: registers all commands', () => {
        const profile = { type: 'ac-cloud-paas' };
        registerCommands(program, profile);
        expectCoreCommands();
        expect(registrars.registerCompanyCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerEventsCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerWebhooksCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerImportCommands).toHaveBeenCalledWith(program, profile);
    });

    test('ac-saas: registers all commands', () => {
        const profile = { type: 'ac-saas' };
        registerCommands(program, profile);
        expectCoreCommands();
        expect(registrars.registerCompanyCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerEventsCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerWebhooksCommands).toHaveBeenCalledWith(program, profile);
        expect(registrars.registerImportCommands).toHaveBeenCalledWith(program, profile);
    });
});
