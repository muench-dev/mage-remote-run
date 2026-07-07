import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/utils.js', () => ({
    printTable: jest.fn(),
    handleError: jest.fn(),
    getFormatHeaders: jest.fn().mockReturnValue({}),
    formatOutput: jest.fn().mockReturnValue(false),
    addFormatOption: jest.fn().mockImplementation(cmd => cmd.option('-f, --format <type>', 'Output format (text, json, xml)', 'text'))
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
        const utilsMod = await import('../lib/utils.js');
        mockClient.get.mockResolvedValue({
            total_segments: [{ title: 'Subtotal', value: 100 }],
            grand_total: 100,
            quote_currency_code: 'USD'
        });

        await program.parseAsync(['node', 'test', 'po-cart', 'totals', 'mycart']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/totals', {}, expect.anything());
        expect(utilsMod.printTable).toHaveBeenCalledWith(['Title', 'Value'], [['Subtotal', 100]]);
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total: 100 USD'));
    });

    it('totals: should handle missing segments', async () => {
        const utilsMod = await import('../lib/utils.js');
        mockClient.get.mockResolvedValue({
            grand_total: 100,
            quote_currency_code: 'USD'
        });

        await program.parseAsync(['node', 'test', 'po-cart', 'totals', 'mycart']);

        expect(utilsMod.printTable).toHaveBeenCalledWith(['Title', 'Value'], []);
    });

    it('shipping-methods: should estimate shipping methods', async () => {
        const utilsMod = await import('../lib/utils.js');
        mockClient.post.mockResolvedValue([
            { carrier_title: 'UPS', method_title: 'Ground', amount: 10, price_excl_tax: 10 }
        ]);

        await program.parseAsync(['node', 'test', 'po-cart', 'shipping-methods', 'mycart', '--address-id', '123']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/estimate-shipping-methods-by-address-id', { addressId: '123' }, expect.anything());
        expect(utilsMod.printTable).toHaveBeenCalledWith(['Carrier', 'Method', 'Amount', 'Price Excl Tax'], [['UPS', 'Ground', 10, 10]]);
    });

    it('payment-info: should display payment info', async () => {
        mockClient.get.mockResolvedValue({
            payment_methods: [{ title: 'Check / Money Order', code: 'checkmo' }],
            totals: { grand_total: 110, quote_currency_code: 'USD' }
        });

        await program.parseAsync(['node', 'test', 'po-cart', 'payment-info', 'mycart']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/purchase-order-carts/mycart/payment-information', {}, expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Check / Money Order (checkmo)'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total: 110 USD'));
    });

    it('payment-info: should handle missing missing methods and totals', async () => {
        mockClient.get.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'po-cart', 'payment-info', 'mycart']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total: undefined undefined'));
    });

    it('totals: should handle error', async () => {
        const utilsMod = await import('../lib/utils.js');
        const error = new Error('Totals Error');
        mockClient.get.mockRejectedValue(error);

        await program.parseAsync(['node', 'test', 'po-cart', 'totals', 'mycart']);

        expect(utilsMod.handleError).toHaveBeenCalledWith(error);
    });

    it('shipping-methods: should handle error', async () => {
        const utilsMod = await import('../lib/utils.js');
        const error = new Error('Shipping Error');
        mockClient.post.mockRejectedValue(error);

        await program.parseAsync(['node', 'test', 'po-cart', 'shipping-methods', 'mycart', '--address-id', '123']);

        expect(utilsMod.handleError).toHaveBeenCalledWith(error);
    });

    it('payment-info: should handle error', async () => {
        const utilsMod = await import('../lib/utils.js');
        const error = new Error('Payment Error');
        mockClient.get.mockRejectedValue(error);

        await program.parseAsync(['node', 'test', 'po-cart', 'payment-info', 'mycart']);

        expect(utilsMod.handleError).toHaveBeenCalledWith(error);
    });

    it('totals: should format output', async () => {
        const utilsMod = await import('../lib/utils.js');
        utilsMod.formatOutput.mockReturnValueOnce(true);
        mockClient.get.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'po-cart', 'totals', 'mycart', '--format', 'json']);

        expect(utilsMod.formatOutput).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(utilsMod.printTable).not.toHaveBeenCalled();
    });

    it('shipping-methods: should format output', async () => {
        const utilsMod = await import('../lib/utils.js');
        utilsMod.formatOutput.mockReturnValueOnce(true);
        mockClient.post.mockResolvedValue([]);

        await program.parseAsync(['node', 'test', 'po-cart', 'shipping-methods', 'mycart', '--address-id', '123', '--format', 'json']);

        expect(utilsMod.formatOutput).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(utilsMod.printTable).not.toHaveBeenCalled();
    });

    it('payment-info: should format output', async () => {
        const utilsMod = await import('../lib/utils.js');
        utilsMod.formatOutput.mockReturnValueOnce(true);
        mockClient.get.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'po-cart', 'payment-info', 'mycart', '--format', 'json']);

        expect(utilsMod.formatOutput).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(utilsMod.printTable).not.toHaveBeenCalled();
    });
});
