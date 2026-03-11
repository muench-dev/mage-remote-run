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

        it('should search store groups', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'main', name: 'Main Store', website_id: 1, root_category_id: 2 },
                { id: 2, code: 'test', name: 'Test Store', website_id: 1, root_category_id: 2 }
            ]);

            await program.parseAsync(['node', 'test', 'store', 'group', 'search', 'main']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeGroups');
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should delete store group when confirmed', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: true });

            await program.parseAsync(['node', 'test', 'store', 'group', 'delete', '1']);

            expect(mockClient.delete).toHaveBeenCalledWith('V1/store/storeGroups/1');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should not delete store group when not confirmed', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: false });

            await program.parseAsync(['node', 'test', 'store', 'group', 'delete', '1']);

            expect(mockClient.delete).not.toHaveBeenCalled();
        });

        it('should edit store group', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'main', name: 'Main Store', website_id: 1, root_category_id: 2 }
            ]);
            inquirer.default.prompt.mockResolvedValue({ name: 'New Name', code: 'new_code', website_id: 2 });

            await program.parseAsync(['node', 'test', 'store', 'group', 'edit', '1']);

            expect(mockClient.put).toHaveBeenCalledWith('V1/store/storeGroups/1', {
                group: { id: 1, name: 'New Name', code: 'new_code', website_id: 2 }
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
        });

        it('should fail to edit missing store group', async () => {
            mockClient.get.mockResolvedValue([]);

            await program.parseAsync(['node', 'test', 'store', 'group', 'edit', '1']);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Store 1 not found');
        });

        it('should handle list errors', async () => {
            mockClient.get.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'group', 'list']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });

        it('should handle search errors', async () => {
            mockClient.get.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'group', 'search', 'main']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });

        it('should handle delete errors', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: true });
            mockClient.delete.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'group', 'delete', '1']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
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

        it('should search store views', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'default', name: 'Default Store View', store_group_id: 1, is_active: 1 },
                { id: 2, code: 'test', name: 'Test Store View', store_group_id: 1, is_active: 1 }
            ]);

            await program.parseAsync(['node', 'test', 'store', 'view', 'search', 'default']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeViews');
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should delete store view when confirmed', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: true });

            await program.parseAsync(['node', 'test', 'store', 'view', 'delete', '1']);

            expect(mockClient.delete).toHaveBeenCalledWith('V1/store/storeViews/1');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should not delete store view when not confirmed', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: false });

            await program.parseAsync(['node', 'test', 'store', 'view', 'delete', '1']);

            expect(mockClient.delete).not.toHaveBeenCalled();
        });

        it('should edit store view', async () => {
            mockClient.get.mockResolvedValue([
                { id: 1, code: 'default', name: 'Default Store View', store_group_id: 1, is_active: 1 }
            ]);
            inquirer.default.prompt.mockResolvedValue({ name: 'New View Name', code: 'new_view_code', is_active: 0 });

            await program.parseAsync(['node', 'test', 'store', 'view', 'edit', '1']);

            expect(mockClient.put).toHaveBeenCalledWith('V1/store/storeViews/1', {
                store: { id: 1, name: 'New View Name', code: 'new_view_code', is_active: 0 }
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
        });

        it('should fail to edit missing store view', async () => {
            mockClient.get.mockResolvedValue([]);

            await program.parseAsync(['node', 'test', 'store', 'view', 'edit', '1']);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'View 1 not found');
        });

        it('should handle list errors', async () => {
            mockClient.get.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'view', 'list']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });

        it('should handle search errors', async () => {
            mockClient.get.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'view', 'search', 'main']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });

        it('should handle delete errors', async () => {
            inquirer.default.prompt.mockResolvedValue({ confirm: true });
            mockClient.delete.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'view', 'delete', '1']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });
    });

    describe('store config list', () => {
        it('should handle list errors', async () => {
            mockClient.get.mockRejectedValue(new Error('API Error'));
            await program.parseAsync(['node', 'test', 'store', 'config', 'list']);
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });
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
