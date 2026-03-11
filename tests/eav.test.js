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
const { registerEavCommands } = await import('../lib/commands/eav.js');

describe('EAV Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerEavCommands(program);
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

    it('attribute-set list: should list sets', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ attribute_set_id: 1, attribute_set_name: 'Default', entity_type_id: 4 }]
        });

        await program.parseAsync(['node', 'test', 'eav', 'attribute-set', 'list']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('attribute-set show: should show details', async () => {
        mockClient.get.mockResolvedValue({
            attribute_set_id: 1, attribute_set_name: 'Default'
        });

        await program.parseAsync(['node', 'test', 'eav', 'attribute-set', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/eav/attribute-sets/1', {}, expect.anything());
    });
});
