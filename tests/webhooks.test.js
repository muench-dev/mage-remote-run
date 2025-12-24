import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));
jest.unstable_mockModule('../lib/utils.js', () => ({
    printTable: jest.fn(),
    handleError: jest.fn()
}));
jest.unstable_mockModule('chalk', () => ({
    default: {
        bold: (msg) => msg,
        gray: (msg) => msg,
        cyan: (msg) => msg,
        green: (msg) => msg,
        red: (msg) => msg
    }
}));

const { createClient } = await import('../lib/api/factory.js');
const { printTable, handleError } = await import('../lib/utils.js');
const { registerWebhooksCommands } = await import('../lib/commands/webhooks.js');
const { Command } = await import('commander');

describe('Webhook Commands', () => {
    let program;
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        program = new Command();
        mockClient = {
            get: jest.fn()
        };
        createClient.mockResolvedValue(mockClient);

        // Suppress console output
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });

        registerWebhooksCommands(program);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('webhook list', () => {
        it('should list webhooks with default options', async () => {
            const mockData = {
                items: [
                    { hook_id: 1, name: 'Hook 1', status: '1', store_ids: ['1'], url: 'http://example.com' }
                ],
                total_count: 1
            };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'list']);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/list', expect.objectContaining({
                'searchCriteria[currentPage]': '1',
                'searchCriteria[pageSize]': '20'
            }), expect.any(Object));
            expect(printTable).toHaveBeenCalledWith(
                ['ID', 'Name', 'Status', 'Store IDs', 'URL'],
                [[1, 'Hook 1', '1', '1', 'http://example.com']]
            );
        });

        it('should list webhooks in JSON format', async () => {
            const mockData = { items: [], total_count: 0 };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'list', '--format', 'json']);

            expect(mockClient.get).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });
    });
});
