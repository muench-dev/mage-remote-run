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
        bold: {
            cyan: (t) => t
        },
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
    let consoleErrorSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerStoresCommands(program);
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

    describe('store group list', () => {
        it('should list store groups', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'main', name: 'Main Store', website_id: 1, root_category_id: 2 }
            ]);

            await program.parseAsync(['node', 'test', 'store', 'group', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeGroups', {}, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should list store groups as JSON', async () => {
            const mockData = [{ id: 1, code: 'main' }];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'store', 'group', 'list', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });
    });

    describe('store view list', () => {
        it('should list store views', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'default', name: 'Default Store View', store_group_id: 1, is_active: 1 }
            ]);

            await program.parseAsync(['node', 'test', 'store', 'view', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeViews', {}, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should list store views as JSON', async () => {
            const mockData = [{ id: 1, code: 'default' }];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'store', 'view', 'list', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });
    });

    describe('store config list', () => {
        it('should list store configs', async () => {
            mockClient.get.mockResolvedValue([
                {
                    id: 1,
                    code: 'default',
                    website_id: 1,
                    locale: 'en_US',
                    timezone: 'UTC',
                    weight_unit: 'lbs',
                    base_currency_code: 'USD',
                    default_display_currency_code: 'USD',
                    base_url: 'http://example.com/',
                    secure_base_url: 'https://example.com/'
                }
            ]);

            await program.parseAsync(['node', 'test', 'store', 'config', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeConfigs');
            // Check for vertical output format elements
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[ID: 1] default'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Website ID:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Base Link URL:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Secure Link URL:'));
        });
    });
});
