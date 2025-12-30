import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock
const chalkProxy = new Proxy(function (str) { return str; }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0]
});

jest.unstable_mockModule('chalk', () => ({
    default: chalkProxy
}));

jest.unstable_mockModule('cli-table3', () => ({
    default: jest.fn().mockImplementation(() => ({
        push: jest.fn(),
        toString: jest.fn(() => 'MOCK_TABLE')
    }))
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerPurchaseOrderCartCommands } = await import('../lib/commands/purchase-order-cart.js');

describe('Purchase Order Cart Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerPurchaseOrderCartCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn()
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('totals: should display cart totals', async () => {
        mockClient.get.mockResolvedValue({
            total_segments: [{ title: 'Subtotal', value: 100 }],
            grand_total: 100,
            quote_currency_code: 'USD'
        });

        await program.parseAsync(['node', 'test', 'po-cart', 'totals', 'mycart']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/totals');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total: 100 USD'));
    });

    it('shipping-methods: should estimate shipping methods', async () => {
        mockClient.post.mockResolvedValue([
            { carrier_title: 'UPS', method_title: 'Ground', amount: 10, price_excl_tax: 10 }
        ]);

        await program.parseAsync(['node', 'test', 'po-cart', 'shipping-methods', 'mycart', '--address-id', '123']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/estimate-shipping-methods-by-address-id', { addressId: '123' });
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('payment-info: should display payment info', async () => {
        mockClient.get.mockResolvedValue({
            payment_methods: [{ title: 'Check / Money Order', code: 'checkmo' }],
            totals: { grand_total: 110, quote_currency_code: 'USD' }
        });

        await program.parseAsync(['node', 'test', 'po-cart', 'payment-info', 'mycart']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/payment-information');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check / Money Order (checkmo)'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total: 110 USD'));
    });
});
