import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('chalk', () => ({
    default: {
        blue: (t) => t,
        green: (t) => t,
        red: (t) => t,
        yellow: (t) => t,
        gray: (t) => t,
        cyan: (t) => t,
        bold: (t) => t,
    }
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

const factoryMod = await import('../lib/api/factory.js');
const { registerStoresCommands } = await import('../lib/commands/stores.js');
const inquirer = await import('inquirer');

describe('Stores Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerStoresCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            get: jest.fn(),
            delete: jest.fn()
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('list: should list stores', async () => {
        mockClient.get.mockResolvedValue([{ id: 1, code: 'default' }]);

        await program.parseAsync(['node', 'test', 'store', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('store/storeGroups');
    });

    it('view list: should list store views', async () => {
        mockClient.get.mockResolvedValue([{ id: 1, name: 'Default', code: 'default' }]);
        // Command nesting: store view list
        await program.parseAsync(['node', 'test', 'store', 'view', 'list']);
        expect(mockClient.get).toHaveBeenCalledWith('store/storeViews');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('delete: should delete store group', async () => {
        // mockClient.get.mockResolvedValue([{ id: 5, code: 'my_store' }]);
        inquirer.default.prompt.mockResolvedValue({ confirm: true });
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'store', 'delete', '5']);

        expect(mockClient.delete).toHaveBeenCalledWith('store/storeGroups/5');
    });
});
