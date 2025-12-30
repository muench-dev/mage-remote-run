
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn(),
    select: jest.fn(),
    confirm: jest.fn()
}));
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));
jest.unstable_mockModule('../lib/utils.js', () => ({
    printTable: jest.fn(),
    handleError: jest.fn()
}));
jest.unstable_mockModule('chalk', () => ({
    default: {
        bold: Object.assign((msg) => msg, { blue: (msg) => msg }),
        gray: (msg) => msg,
        cyan: (msg) => msg,
        green: (msg) => msg,
        red: (msg) => msg,
        blue: (msg) => msg,
        yellow: (msg) => msg
    }
}));

const { createClient } = await import('../lib/api/factory.js');
const { printTable, handleError } = await import('../lib/utils.js');
const { registerWebhooksCommands } = await import('../lib/commands/webhooks.js');
const { Command } = await import('commander');
const { input, select, confirm } = await import('@inquirer/prompts');

describe('Webhook Commands', () => {
    let program;
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        select.mockReset();
        input.mockReset();
        confirm.mockReset();
        program = new Command();
        mockClient = {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn()
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
            const mockData = [
                { hook_name: 'Hook 1', webhook_type: 'observer', method: 'POST', priority: 0, url: 'http://example.com' }
            ];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'list']);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/list', {}, expect.any(Object));
            expect(printTable).toHaveBeenCalledWith(
                ['Name', 'Type', 'Method', 'Priority', 'URL'],
                [['Hook 1', 'observer', 'POST', 0, 'http://example.com']]
            );
        });

        it('should list webhooks in JSON format', async () => {
            const mockData = [];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'list', '--format', 'json']);

            expect(mockClient.get).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });
    });

    describe('webhook show', () => {
        it('should show webhook details', async () => {
            const mockData = [
                { hook_name: 'Test Hook', webhook_type: 'type1', url: 'http://url', method: 'POST' }
            ];
            // Mock get list for finding
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'show', 'Test Hook']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/list');
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test Hook'));
        });

        it('should prompt for webhook selection if Name is missing (show)', async () => {
            const mockData = [{ hook_name: 'Interactive Hook', webhook_type: 'type' }];
            mockClient.get.mockResolvedValue(mockData);
            select.mockResolvedValue('Interactive Hook');

            await program.parseAsync(['node', 'test', 'webhook', 'show']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/list');
            expect(select).toHaveBeenCalled();
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Interactive Hook'));
        });
    });

    describe('webhook create', () => {
        it('should create a webhook with options', async () => {
            mockClient.post.mockResolvedValue(true);
            select.mockResolvedValueOnce(false); // For "Is Required?" prompt

            await program.parseAsync([
                'node', 'test', 'webhook', 'create',
                '--name', 'New Hook',
                '--type', 'observer',
                '--url', 'http://example.com/new',
                '--method', 'POST'
            ]);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', {
                webhook: expect.objectContaining({
                    hook_name: 'New Hook',
                    webhook_type: 'observer',
                    url: 'http://example.com/new',
                    method: 'POST',
                    required: false
                })
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('subscribed'));
        });

        it('should prompt for name, type, and url if missing', async () => {
            mockClient.post.mockResolvedValue(true);
            // Sequence: Name (input) -> Type (select) -> URL (input) -> Method (select) -> Required (select)
            input.mockResolvedValueOnce('Interactive Hook') // Name
                .mockResolvedValueOnce('http://example.com/interactive'); // URL

            select.mockResolvedValueOnce('observer') // Type
                .mockResolvedValueOnce('POST') // Method
                .mockResolvedValueOnce(false); // Required

            await program.parseAsync(['node', 'test', 'webhook', 'create']);

            expect(input).toHaveBeenCalledTimes(2);
            expect(select).toHaveBeenCalledTimes(3);
            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', expect.objectContaining({
                webhook: expect.objectContaining({
                    hook_name: 'Interactive Hook',
                    webhook_type: 'observer',
                    url: 'http://example.com/interactive',
                    method: 'POST',
                    required: false
                })
            }));
        });
    });

    describe('webhook delete', () => {
        it('should delete a webhook with argument', async () => {
            const mockData = [{ hook_name: 'Delete Me', webhook_type: 'type' }];
            mockClient.get.mockResolvedValue(mockData); // for list
            mockClient.post.mockResolvedValue(true);
            confirm.mockResolvedValue(true);

            await program.parseAsync(['node', 'test', 'webhook', 'delete', 'Delete Me']);

            expect(createClient).toHaveBeenCalled();
            expect(confirm).toHaveBeenCalled();
            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/unsubscribe', { webhook: mockData[0] });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
        });

        it('should prompt for selection if Name is missing (delete)', async () => {
            const mockData = [{ hook_name: 'Delete Me', webhook_type: 'type' }];
            mockClient.get.mockResolvedValue(mockData);
            select.mockResolvedValue('Delete Me');
            confirm.mockResolvedValue(true);
            mockClient.post.mockResolvedValue(true); // unsubscribe

            await program.parseAsync(['node', 'test', 'webhook', 'delete']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/list');
            expect(select).toHaveBeenCalled();
            expect(confirm).toHaveBeenCalled();
            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/unsubscribe', { webhook: mockData[0] });
        });
    });
});
