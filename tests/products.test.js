import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock for Chaining
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

jest.unstable_mockModule('html-to-text', () => ({
    convert: jest.fn((text) => text.replace(/<[^>]*>/g, ''))
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerProductsCommands } = await import('../lib/commands/products.js');

describe('Product Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerProductsCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            get: jest.fn(),
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('list: should list products with sorting', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--sort-by', 'price', '--sort-order', 'DESC']);

        const expectedParams = {
            'searchCriteria[currentPage]': '1',
            'searchCriteria[pageSize]': '20',
            'searchCriteria[sortOrders][0][field]': 'price',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        };

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/products', expectedParams, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('attribute list: should list attributes', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ attribute_code: 'name', default_frontend_label: 'Name', is_required: true, is_user_defined: false }]
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'list']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('show: should show product details', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            extension_attributes: { stock_item: { is_in_stock: true, qty: 100 } },
            custom_attributes: [{ attribute_code: 'description', value: '<p>Test <strong>Description</strong></p>' }]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/TS123', expect.anything(), expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Product Information'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Description')); // html-to-text should remove tags
    });

    it('type list: should list product types', async () => {
        mockClient.get.mockResolvedValue([
            { name: 'Simple', label: 'Simple Product' }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'type', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/types');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });
});
