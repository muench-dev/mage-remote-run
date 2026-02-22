import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Robust Chalk Mock for Chaining
const chalkProxy = new Proxy(function (str) { return str; }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0]
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

jest.unstable_mockModule('@inquirer/prompts', () => ({
    select: jest.fn()
}));


const factoryMod = await import('../lib/api/factory.js');
const { registerCompanyCommands } = await import('../lib/commands/company.js');
const inquirer = await import('inquirer');
const { select } = await import('@inquirer/prompts');

describe('Company Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerCompanyCommands(program);
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

    // --- Company Management ---

    it('list: should display companies', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'company', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/company', expect.anything(), expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('show: should show company details', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1,
            street: '123 Main St', city: 'Anytown', country_id: 'US'
        });

        await program.parseAsync(['node', 'test', 'company', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/company/1', expect.anything(), expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Company Information'));
    });

    it('create: should create a company', async () => {
        inquirer.default.prompt.mockResolvedValue({
            company_name: 'New Co',
            company_email: 'new@co.com',
            email: 'admin@co.com',
            street: 'Straight Rd',
            city: 'Citadel'
        });
        mockClient.post.mockResolvedValue({ id: 100 });

        await program.parseAsync(['node', 'test', 'company', 'create']);

        // Verify default country is US by default
        expect(inquirer.default.prompt).toHaveBeenNthCalledWith(2, expect.arrayContaining([
            expect.objectContaining({ name: 'country_id', default: 'US' })
        ]));

        expect(mockClient.post).toHaveBeenCalledWith('V1/company', expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Company created with ID: 100'));
    });

    it('create: should use default country from env', async () => {
        process.env.MAGE_DEFAULT_COUNTRY = 'CA';
        inquirer.default.prompt.mockResolvedValue({
            company_name: 'New Co',
            company_email: 'new@co.com',
            email: 'admin@co.com',
            street: 'Straight Rd',
            city: 'Citadel'
        });
        mockClient.post.mockResolvedValue({ id: 101 });

        await program.parseAsync(['node', 'test', 'company', 'create']);

        // Verify inquirer was called with correct default country
        // 1st call is basic info, 2nd call is address
        expect(inquirer.default.prompt).toHaveBeenNthCalledWith(2, expect.arrayContaining([
            expect.objectContaining({ name: 'country_id', default: 'CA' })
        ]));

        delete process.env.MAGE_DEFAULT_COUNTRY;
    });

    it('update: should update company details', async () => {
        // Mock get existing
        mockClient.get.mockResolvedValue({
            id: 1,
            company_name: 'Old Name',
            company_email: 'old@example.com',
            sales_representative_id: 1,
            customer_group_id: 1
        });

        // Mock prompt answers
        inquirer.default.prompt.mockResolvedValue({
            company_name: 'New Name',
            company_email: 'new@example.com',
            sales_representative_id: '2',
            customer_group_id: '2'
        });

        mockClient.put.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'company', 'update', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/company/1');

        // Expect wrapped payload
        expect(mockClient.put).toHaveBeenCalledWith('V1/company/1', expect.objectContaining({
            company: expect.objectContaining({
                id: 1,
                company_name: 'New Name',
                sales_representative_id: '2',
                customer_group_id: '2'
            })
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Company 1 updated'));
    });

    it('delete: should delete company if confirmed', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: true });
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'company', 'delete', '1']);

        expect(mockClient.delete).toHaveBeenCalledWith('V1/company/1');
    });

    it('structure: should show company structure', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, company_name: 'Acme', parent_id: 2, legal_name: 'Acme Corp'
        });

        await program.parseAsync(['node', 'test', 'company', 'structure', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/company/1');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Company Structure for Acme'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Parent ID: 2'));
    });

    // --- Company Roles ---

    it('role list: should list roles', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ role_id: 1, role_name: 'Admin', company_id: 1 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'company', 'role', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/company/role', { 'searchCriteria[pageSize]': 20 });
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    // --- Company Credits ---

    it('credit show: should show credit details', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, balance: 100, currency_code: 'USD', credit_limit: 1000, available_limit: 900
        });

        await program.parseAsync(['node', 'test', 'company', 'credit', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/companyCredits/company/1');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Credit ID: 1'));
    });

    it('credit increase: should increase balance', async () => {
        // Mock get credit profile for currency call
        mockClient.get.mockResolvedValueOnce({
            id: 1, currency_code: 'USD'
        });
        mockClient.post.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'increase', '1', '50']);

        // Expect fetch for currency
        expect(mockClient.get).toHaveBeenCalledWith('V1/companyCredits/1');

        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/1/increaseBalance', expect.objectContaining({
            value: 50,
            currency: 'USD',
            operationType: 2
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Credit 1 increased'));
    });

    it('credit decrease: should decrease balance', async () => {
        // Mock get credit profile for currency call
        mockClient.get.mockResolvedValueOnce({
            id: 1, currency_code: 'USD'
        });
        mockClient.post.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'decrease', '1', '25']);

        // Expect fetch for currency
        expect(mockClient.get).toHaveBeenCalledWith('V1/companyCredits/1');

        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/1/decreaseBalance', expect.objectContaining({
            value: 25,
            currency: 'USD',
            operationType: 3
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Credit 1 decreased'));
    });

    it('credit history: should show credit history', async () => {
        // First call: get credit profile
        mockClient.get.mockResolvedValueOnce({
            id: 55, balance: 100
        });
        // Second call: get history
        mockClient.get.mockResolvedValueOnce({
            items: [{ datetime: '2023-01-01', type: 1, amount: 10, balance: 110, comment: 'Test' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'company', 'credit', 'history', '1']);

        expect(mockClient.get).toHaveBeenNthCalledWith(1, 'V1/companyCredits/company/1');
        expect(mockClient.get).toHaveBeenNthCalledWith(2, 'V1/companyCredits/history', expect.objectContaining({
            'searchCriteria[filterGroups][0][filters][0][field]': 'company_credit_id',
            'searchCriteria[filterGroups][0][filters][0][value]': 55
        }));

        // Assert that the table data preparation happened implicitly via MOCK_TABLE or similar if we could assert args
        // Since we mock cli-table3 and it returns 'MOCK_TABLE', we assume success if no error is thrown
        // Ideally we would inspect the array passed to printTable if possible, but that's a util.
    });

});
