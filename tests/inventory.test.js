
import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock for Chaining
const chalkProxy = new Proxy(() => { }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0] // Return the first argument (string) as is
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
const { registerInventoryCommands } = await import('../lib/commands/inventory.js');

describe('Inventory Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerInventoryCommands(program);
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

    it('stock list: should list inventory stocks', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ stock_id: 1, name: 'Default Stock' }]
        });

        await program.parseAsync(['node', 'test', 'inventory', 'stock', 'list']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/inventory/stocks', expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('stock show: should show stock details', async () => {
        mockClient.get.mockResolvedValue({
            stock_id: 1, name: 'Default Stock',
            extension_attributes: { sales_channels: [{ type: 'website', code: 'base' }] }
        });

        await program.parseAsync(['node', 'test', 'inventory', 'stock', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/inventory/stocks/1');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Stock Information'));
    });

    it('resolve-stock: should resolve stock correctly', async () => {
        mockClient.get.mockResolvedValue({ stock_id: 1 });

        await program.parseAsync(['node', 'test', 'inventory', 'resolve-stock', 'website', 'base']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/inventory/stock-resolver/website/base');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Resolved Stock ID: 1'));
    });

    it('source list: should list inventory sources', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ source_code: 'default', name: 'Default Source', enabled: true, postcode: '12345' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'inventory', 'source', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/inventory/sources', expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('ssa list: should list source selection algorithms', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ code: 'priority', title: 'Priority', description: 'Priority Algorithm' }]
        });

        await program.parseAsync(['node', 'test', 'inventory', 'source', 'selection-algorithm', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/inventory/source-selection-algorithm-list');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });
});
