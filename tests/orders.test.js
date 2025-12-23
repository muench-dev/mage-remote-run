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

jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn()
    }
}));

jest.unstable_mockModule('@inquirer/prompts', () => ({
    select: jest.fn()
}));


const factoryMod = await import('../lib/api/factory.js');
const { registerOrdersCommands } = await import('../lib/commands/orders.js');
const inquirer = await import('inquirer');
const inquirerPrompts = await import('@inquirer/prompts');

describe('Order Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerOrdersCommands(program);
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

    it('latest: should list latest orders', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', grand_total: 100, status: 'pending', created_at: '2023-01-01' }]
        });

        await program.parseAsync(['node', 'test', 'order', 'latest']);

        expect(mockClient.get).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('show: should show order details', async () => {
        mockClient.get.mockResolvedValue({
            entity_id: 1, increment_id: '100000001', items: [], billing_address: {}, payment: {}
        });

        await program.parseAsync(['node', 'test', 'order', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('orders/1', expect.anything(), expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order Information'));
    });
});
