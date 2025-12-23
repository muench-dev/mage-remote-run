import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock for Chaining
const chalkProxy = new Proxy(() => { }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0] // Return the first argument (string) as is
});

jest.unstable_mockModule('chalk', () => ({
    default: chalkProxy
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
const { registerCustomersCommands } = await import('../lib/commands/customers.js');
const inquirer = await import('inquirer');

describe('Customers Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerCustomersCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
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

    it('list: should display customers', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User', group_id: 1, website_id: 1 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'list']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/customers/search', expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('search: should search customers by email', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, email: 'test@example.com' }]
        });

        await program.parseAsync(['node', 'test', 'customer', 'search', 'test@example.com']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/customers/search', expect.anything());
    });

    it('show: should show customer details', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User',
            group_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01',
            website_id: 1, store_id: 1, addresses: []
        });

        await program.parseAsync(['node', 'test', 'customer', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/customers/1', expect.anything(), expect.anything());
        // Chalk mock returns plain string now, so we assume "Customer Information" is printed AS IS or at least containing it.
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Customer Information'));
    });

    it('delete: should delete customer if confirmed', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: true });
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'customer', 'delete', '1']);

        expect(mockClient.delete).toHaveBeenCalledWith('V1/customers/1');
    });

    it('confirm: should resend confirmation', async () => {
        mockClient.get.mockResolvedValue({ email: 'a@b.com', website_id: 1 });
        mockClient.post.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'customer', 'confirm', '1']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/customers/confirm', expect.anything());
    });
    it('group list: should list customer groups', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, code: 'General', tax_class_id: 3 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'group', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/customerGroups/search', expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });
});
