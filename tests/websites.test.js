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
const { registerWebsitesCommands } = await import('../lib/commands/websites.js');
const inquirer = await import('inquirer');

describe('Websites Commands', () => {
    let program;
    let consoleLogSpy;
    let consoleErrorSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerWebsitesCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
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

    it('list: should fetch and display websites', async () => {
        mockClient.get.mockResolvedValue([
            { id: 1, code: 'base', name: 'Main', default_group_id: 1 }
        ]);

        await program.parseAsync(['node', 'test', 'website', 'list']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/store/websites', {}, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('search: should filter websites', async () => {
        mockClient.get.mockResolvedValue([
            { id: 1, code: 'base', name: 'Main', default_group_id: 1 }
        ]);

        await program.parseAsync(['node', 'test', 'website', 'search', 'Main']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/store/websites');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('delete: should delete website if confirmed', async () => {
        // Mock get not needed as delete command doesn't fetch first in current impl (based on previous view)
        inquirer.default.prompt.mockResolvedValue({ confirm: true });
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'website', 'delete', '1']);

        expect(mockClient.delete).toHaveBeenCalledWith('V1/store/websites/1');
    });

    it('delete: should not delete if not confirmed', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: false });

        await program.parseAsync(['node', 'test', 'website', 'delete', '1']);

        expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('list: should output json format', async () => {
        mockClient.get.mockResolvedValue([
            { id: 1, code: 'base', name: 'Main', default_group_id: 1 }
        ]);

        await program.parseAsync(['node', 'test', 'website', 'list', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"code"'));
    });

    it('list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));

        await program.parseAsync(['node', 'test', 'website', 'list']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('search: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));

        await program.parseAsync(['node', 'test', 'website', 'search', 'Main']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('edit: should edit a website', async () => {
        mockClient.get.mockResolvedValue([
            { id: 1, code: 'base', name: 'Main', default_group_id: 1, sort_order: 0 }
        ]);
        inquirer.default.prompt.mockResolvedValue({
            name: 'Updated Main',
            code: 'base',
            default_group_id: 1,
            sort_order: 0
        });
        mockClient.put.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'website', 'edit', '1']);

        expect(mockClient.put).toHaveBeenCalledWith('V1/store/websites/1', expect.objectContaining({
            website: expect.objectContaining({ id: 1, name: 'Updated Main' })
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
    });

    it('edit: should handle website not found', async () => {
        mockClient.get.mockResolvedValue([
            { id: 2, code: 'other', name: 'Other', default_group_id: 2, sort_order: 0 }
        ]);

        await program.parseAsync(['node', 'test', 'website', 'edit', '1']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
