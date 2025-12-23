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

    it('attribute list: should list attributes', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ attribute_code: 'name', default_frontend_label: 'Name', is_required: true, is_user_defined: false }]
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'list']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('types: should list product types', async () => {
        mockClient.get.mockResolvedValue([
            { name: 'Simple', label: 'Simple Product' }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'types']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });
});
