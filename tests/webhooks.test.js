
import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn(),
    select: jest.fn(),
    confirm: jest.fn()
}));
jest.unstable_mockModule('@inquirer/search', () => ({
    default: jest.fn()
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
const search = (await import('@inquirer/search')).default;

describe('Webhook Commands', () => {
    let program;
    let mockClient;

    beforeEach(() => {
        jest.clearAllMocks();
        select.mockReset();
        input.mockReset();
        confirm.mockReset();
        search.mockReset();
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

    describe('webhook supported-list', () => {
        it('should list supported webhook types with default format', async () => {
            const mockData = [
                { name: 'observer.catalog_product_save_after' },
                { name: 'observer.customer_save_before' }
            ];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'supported-list']);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/webhooks/supportedList', {}, expect.any(Object));
            expect(printTable).toHaveBeenCalledWith(
                ['Webhook Method'],
                [
                    ['observer.catalog_product_save_after'],
                    ['observer.customer_save_before']
                ]
            );
        });

        it('should list supported webhook types in JSON format', async () => {
            const mockData = [
                { name: 'observer.catalog_product_save_after' }
            ];
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'webhook', 'supported-list', '--format', 'json']);

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

            await program.parseAsync([
                'node', 'test', 'webhook', 'create',
                '--name', 'New Hook',
                '--webhook-method', 'observer.catalog_product_save_after',
                '--webhook-type', 'after',
                '--url', 'http://example.com/new',
                '--method', 'POST',
                '--batch-name', 'default',
                '--batch-order', '0',
                '--priority', '0',
                '--timeout', '5000',
                '--soft-timeout', '3000',
                '--ttl', '3600',
                '--fallback-error-message', 'Error',
                '--required'
            ]);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', {
                webhook: expect.objectContaining({
                    hook_name: 'New Hook',
                    webhook_method: 'observer.catalog_product_save_after',
                    webhook_type: 'after',
                    url: 'http://example.com/new',
                    method: 'POST',
                    batch_name: 'default',
                    batch_order: 0,
                    priority: 0,
                    timeout: 5000,
                    soft_timeout: 3000,
                    ttl: 3600,
                    fallback_error_message: 'Error',
                    required: true
                })
            });
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('subscribed'));
        });

        it('should prompt for name, webhook method, and url if missing', async () => {
            mockClient.post.mockResolvedValue(true);
            // Mock supportedList call
            mockClient.get.mockResolvedValueOnce([
                { name: 'observer.catalog_product_save_after' },
                { name: 'observer.customer_save_before' }
            ]);

            // Sequence: Name -> Webhook Method (search) -> Webhook Type -> URL -> HTTP Method -> 
            // Batch Name -> Batch Order -> Priority -> Timeout -> Soft Timeout -> TTL -> Fallback Msg -> Required
            // -> Add fields? -> Add headers? -> Add rules?
            input.mockResolvedValueOnce('Interactive Hook') // Name
                .mockResolvedValueOnce('http://example.com/interactive') // URL
                .mockResolvedValueOnce('default') // Batch Name
                .mockResolvedValueOnce('0') // Batch Order
                .mockResolvedValueOnce('0') // Priority
                .mockResolvedValueOnce('5000') // Timeout
                .mockResolvedValueOnce('3000') // Soft Timeout
                .mockResolvedValueOnce('3600') // TTL
                .mockResolvedValueOnce('Webhook execution failed'); // Fallback Error Message

            search.mockResolvedValueOnce('observer.catalog_product_save_after'); // Webhook Method (from search)

            select.mockResolvedValueOnce('after') // Webhook Type
                .mockResolvedValueOnce('POST') // HTTP Method
                .mockResolvedValueOnce(false); // Required

            confirm.mockResolvedValueOnce(false) // Add fields?
                .mockResolvedValueOnce(false) // Add headers?
                .mockResolvedValueOnce(false); // Add rules?

            await program.parseAsync(['node', 'test', 'webhook', 'create']);

            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', expect.objectContaining({
                webhook: expect.objectContaining({
                    hook_name: 'Interactive Hook',
                    webhook_method: 'observer.catalog_product_save_after',
                    webhook_type: 'after',
                    url: 'http://example.com/interactive',
                    method: 'POST',
                    batch_name: 'default',
                    batch_order: 0,
                    priority: 0,
                    timeout: 5000,
                    soft_timeout: 3000,
                    ttl: 3600,
                    fallback_error_message: 'Webhook execution failed',
                    required: false,
                    fields: [],
                    headers: [],
                    rules: []
                })
            }));
        });

        it('should create webhook with JSON fields, headers, and rules', async () => {
            mockClient.post.mockResolvedValue(true);

            const fields = JSON.stringify([{ name: 'order_id', source: 'order.entity_id' }]);
            const headers = JSON.stringify([{ name: 'X-Auth', value: 'token123' }]);
            const rules = JSON.stringify([{ field: 'order.status', operator: 'eq', value: 'complete' }]);

            await program.parseAsync([
                'node', 'test', 'webhook', 'create',
                '--name', 'JSON Hook',
                '--webhook-method', 'observer.sales_order_save_after',
                '--webhook-type', 'after',
                '--url', 'http://example.com/json',
                '--method', 'POST',
                '--batch-name', 'default',
                '--batch-order', '0',
                '--priority', '0',
                '--timeout', '5000',
                '--soft-timeout', '3000',
                '--ttl', '3600',
                '--fallback-error-message', 'Error',
                '--fields', fields,
                '--headers', headers,
                '--rules', rules,
                '--required'
            ]);

            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', {
                webhook: expect.objectContaining({
                    hook_name: 'JSON Hook',
                    webhook_method: 'observer.sales_order_save_after',
                    webhook_type: 'after',
                    url: 'http://example.com/json',
                    method: 'POST',
                    batch_name: 'default',
                    batch_order: 0,
                    priority: 0,
                    timeout: 5000,
                    soft_timeout: 3000,
                    ttl: 3600,
                    fallback_error_message: 'Error',
                    required: true,
                    fields: [{ name: 'order_id', source: 'order.entity_id' }],
                    headers: [{ name: 'X-Auth', value: 'token123' }],
                    rules: [{ field: 'order.status', operator: 'eq', value: 'complete' }]
                })
            });
        });

        it('should collect fields, headers, and rules interactively', async () => {
            mockClient.post.mockResolvedValue(true);
            // Mock supportedList call
            mockClient.get.mockResolvedValueOnce([
                { name: 'observer.catalog_product_save_after' }
            ]);

            // Prompt sequence: Name -> Webhook Method (search) -> Webhook Type (select) -> URL -> HTTP Method (select) ->
            // Batch Name -> Batch Order -> Priority -> Timeout -> Soft Timeout -> TTL -> Fallback Msg -> Required (select) ->
            // Add fields? -> Field name -> Field source -> Add another? ->
            // Add headers? -> Header name -> Header value -> Add another? ->
            // Add rules? -> Rule field -> Rule operator (select) -> Rule value -> Add another?
            input.mockResolvedValueOnce('Interactive Hook') // Name
                .mockResolvedValueOnce('http://example.com/interactive') // URL
                .mockResolvedValueOnce('default') // Batch Name
                .mockResolvedValueOnce('0') // Batch Order
                .mockResolvedValueOnce('0') // Priority
                .mockResolvedValueOnce('5000') // Timeout
                .mockResolvedValueOnce('3000') // Soft Timeout
                .mockResolvedValueOnce('3600') // TTL
                .mockResolvedValueOnce('Webhook execution failed') // Fallback Error Message
                // Field collection
                .mockResolvedValueOnce('order_id') // Field name
                .mockResolvedValueOnce('order.entity_id') // Field source
                // Header collection
                .mockResolvedValueOnce('X-Auth') // Header name
                .mockResolvedValueOnce('token123') // Header value
                // Rule collection
                .mockResolvedValueOnce('order.status') // Rule field
                .mockResolvedValueOnce('complete'); // Rule value

            search.mockResolvedValueOnce('observer.catalog_product_save_after'); // Webhook Method (from search)

            select.mockResolvedValueOnce('after') // Webhook Type
                .mockResolvedValueOnce('POST') // HTTP Method
                .mockResolvedValueOnce(false) // Required
                .mockResolvedValueOnce('eq'); // Rule operator

            confirm.mockResolvedValueOnce(true) // Add fields?
                .mockResolvedValueOnce(false) // Add another field?
                .mockResolvedValueOnce(true) // Add headers?
                .mockResolvedValueOnce(false) // Add another header?
                .mockResolvedValueOnce(true) // Add rules?
                .mockResolvedValueOnce(false); // Add another rule?

            await program.parseAsync(['node', 'test', 'webhook', 'create']);

            expect(mockClient.post).toHaveBeenCalledWith('V1/webhooks/subscribe', expect.objectContaining({
                webhook: expect.objectContaining({
                    hook_name: 'Interactive Hook',
                    webhook_method: 'observer.catalog_product_save_after',
                    webhook_type: 'after',
                    fields: [{ name: 'order_id', source: 'order.entity_id' }],
                    headers: [{ name: 'X-Auth', value: 'token123' }],
                    rules: [{ field: 'order.status', operator: 'eq', value: 'complete' }]
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
