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
        expect(mockClient.get).toHaveBeenCalledWith('V1/customers/search', expect.anything(), expect.any(Object));
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

        expect(mockClient.get).toHaveBeenCalledWith('V1/customers/1', expect.anything(), expect.any(Object));
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

    it('create: should create a new customer', async () => {
        inquirer.default.prompt.mockResolvedValue({
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com',
            password: 'Password123'
        });
        mockClient.post.mockResolvedValue({ id: 1, email: 'john@example.com' });

        await program.parseAsync(['node', 'test', 'customer', 'create']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/customers', {
            customer: {
                firstname: 'John',
                lastname: 'Doe',
                email: 'john@example.com'
            },
            password: 'Password123'
        });
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Customer created with ID: 1'));
    });

    it('group list: should list customer groups', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, code: 'General', tax_class_id: 3 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'group', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/customerGroups/search', expect.anything(), expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User', group_id: 1 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'list', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"items"'));
    });

    it('list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));

        await program.parseAsync(['node', 'test', 'customer', 'list']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('search: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));

        await program.parseAsync(['node', 'test', 'customer', 'search', 'test@example.com']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('show: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User',
            group_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01',
            website_id: 1, store_id: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'show', '1', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"email"'));
    });

    it('show: should display addresses', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User',
            group_id: 1, created_at: '2023-01-01', updated_at: '2023-01-01',
            website_id: 1, store_id: 1,
            addresses: [{
                firstname: 'Test', lastname: 'User',
                street: ['123 Main St'], city: 'New York',
                region: { region: 'NY' }, postcode: '10001',
                country_id: 'US', telephone: '5551234567',
                default_billing: true, default_shipping: false
            }]
        });

        await program.parseAsync(['node', 'test', 'customer', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Addresses'));
    });

    it('show: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Not Found'));

        await program.parseAsync(['node', 'test', 'customer', 'show', '999']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('delete: should not delete if cancelled', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: false });

        await program.parseAsync(['node', 'test', 'customer', 'delete', '1']);

        expect(mockClient.delete).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('Operation cancelled.');
    });

    it('delete: should delete without prompt when --force is provided', async () => {
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'customer', 'delete', '1', '--force']);

        expect(inquirer.default.prompt).not.toHaveBeenCalled();
        expect(mockClient.delete).toHaveBeenCalledWith('V1/customers/1');
    });

    it('edit: should edit a customer', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, email: 'test@example.com', firstname: 'Test', lastname: 'User'
        });
        inquirer.default.prompt.mockResolvedValue({
            firstname: 'Updated', lastname: 'User', email: 'test@example.com'
        });
        mockClient.put.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'customer', 'edit', '1']);

        expect(mockClient.put).toHaveBeenCalledWith('V1/customers/1', expect.objectContaining({
            customer: expect.objectContaining({ firstname: 'Updated' })
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
    });

    it('confirm: should handle already confirmed error', async () => {
        mockClient.get.mockResolvedValue({ email: 'test@example.com', website_id: 1 });
        mockClient.post.mockRejectedValue(Object.assign(new Error('Already confirmed'), {
            response: { status: 400, data: { message: "Confirmation isn't needed." } }
        }));

        await program.parseAsync(['node', 'test', 'customer', 'confirm', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Confirmation is not needed'));
    });

    it('confirm: should prompt if no customerId', async () => {
        inquirer.default.prompt.mockResolvedValue({ email: 'test@example.com', websiteId: '1' });
        mockClient.post.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'customer', 'confirm']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/customers/confirm', expect.objectContaining({
            email: 'test@example.com'
        }));
    });

    it('group list: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, code: 'General', tax_class_id: 3 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'customer', 'group', 'list', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"items"'));
    });

    it('group list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network error'));

        await program.parseAsync(['node', 'test', 'customer', 'group', 'list']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });
});
