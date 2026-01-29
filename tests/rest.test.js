import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock
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

jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn(),
    select: jest.fn(),
    editor: jest.fn()
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerRestCommands } = await import('../lib/commands/rest.js');
const prompts = await import('@inquirer/prompts');

describe('REST Command', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerRestCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            request: jest.fn()
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should execute GET request with path argument', async () => {
        mockClient.request.mockResolvedValue({ id: 1, name: 'Test' });

        await program.parseAsync(['node', 'test', 'rest', 'V1/customers/1', '-m', 'GET']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.request).toHaveBeenCalledWith('GET', 'V1/customers/1', undefined, {}, expect.objectContaining({
            headers: { 'Content-Type': 'application/json' }
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ id: 1, name: 'Test' }, null, 2));
    });

    it('should ask for path if missing', async () => {
        prompts.input.mockResolvedValue('V1/customers/1');
        mockClient.request.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'rest', '-m', 'GET']);

        expect(prompts.input).toHaveBeenCalled();
        expect(mockClient.request).toHaveBeenCalledWith('GET', 'V1/customers/1', undefined, {}, expect.anything());
    });

    it('should ask for method if missing', async () => {
        prompts.select.mockResolvedValue('GET');
        mockClient.request.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'rest', 'V1/customers/1']);

        expect(prompts.select).toHaveBeenCalled();
        expect(mockClient.request).toHaveBeenCalledWith('GET', 'V1/customers/1', undefined, {}, expect.anything());
    });

    it('should execute POST request with data', async () => {
        const payload = { customer: { email: 'test@example.com' } };
        mockClient.request.mockResolvedValue({ id: 2 });

        await program.parseAsync(['node', 'test', 'rest', 'V1/customers', '-m', 'POST', '-d', JSON.stringify(payload)]);

        expect(mockClient.request).toHaveBeenCalledWith('POST', 'V1/customers', payload, {}, expect.anything());
    });

    it('should ask for body if missing for POST', async () => {
        const payload = { customer: { email: 'test@example.com' } };
        prompts.editor.mockResolvedValue(JSON.stringify(payload));
        mockClient.request.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'rest', 'V1/customers', '-m', 'POST']);

        expect(prompts.editor).toHaveBeenCalled();
        expect(mockClient.request).toHaveBeenCalledWith('POST', 'V1/customers', payload, {}, expect.anything());
    });

    it('should fail on invalid JSON', async () => {
        await program.parseAsync(['node', 'test', 'rest', 'V1/customers', '-m', 'POST', '-d', '{invalid']);
        
        expect(mockClient.request).not.toHaveBeenCalled();
        // The error handling in the command uses console.error via handleError
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error'), expect.stringContaining('Invalid JSON'));
    });

    it('should handle non-object response', async () => {
        mockClient.request.mockResolvedValue('Success');

        await program.parseAsync(['node', 'test', 'rest', 'V1/test', '-m', 'GET']);

        expect(consoleLogSpy).toHaveBeenCalledWith('Success');
    });

    it('should support format=json and set Accept header', async () => {
        mockClient.request.mockResolvedValue({ id: 1 });
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/test', '-m', 'GET', '--format', 'json']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/test',
            undefined,
            {},
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Accept': 'application/json'
                })
            })
        );
        // Should NOT log "Executing..."
        expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Executing'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id": 1'));
    });

    it('should support format=xml and set Accept header', async () => {
        mockClient.request.mockResolvedValue('<xml>Test</xml>');
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/test', '-m', 'GET', '--format', 'xml']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/test',
            undefined,
            {},
            expect.objectContaining({
                headers: expect.objectContaining({
                    'Accept': 'application/xml'
                })
            })
        );
         expect(consoleLogSpy).toHaveBeenCalledWith('<xml>Test</xml>');
    });

    it('should support separate query parameters', async () => {
        mockClient.request.mockResolvedValue({});
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/products', '-m', 'GET', '--query', 'searchCriteria[pageSize]=20&fields=items']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/products',
            undefined,
            expect.objectContaining({
                'searchCriteria[pageSize]': '20',
                'fields': 'items'
            }),
            expect.anything()
        );
    });

    it('should support mixed path params and query option', async () => {
        mockClient.request.mockResolvedValue({});
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/products?id=1', '-m', 'GET', '--query', 'foo=bar']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/products?id=1',
            undefined,
            expect.objectContaining({
                'foo': 'bar'
            }),
            expect.anything()
        );
    });

    it('should support pagination shortcuts', async () => {
        mockClient.request.mockResolvedValue({});
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/products', '-m', 'GET', '--page-size', '20', '--current-page', '2']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/products',
            undefined,
            expect.objectContaining({
                'searchCriteria[pageSize]': '20',
                'searchCriteria[currentPage]': '2'
            }),
            expect.anything()
        );
    });

    it('should merge pagination shortcuts with query option', async () => {
        mockClient.request.mockResolvedValue({});
        
        await program.parseAsync(['node', 'test', 'rest', 'V1/products', '-m', 'GET', '--query', 'fields=items', '--page-size', '5']);

        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            'V1/products',
            undefined,
            expect.objectContaining({
                'fields': 'items',
                'searchCriteria[pageSize]': '5'
            }),
            expect.anything()
        );
    });
});
