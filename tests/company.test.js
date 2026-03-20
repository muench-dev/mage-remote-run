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
        process.env.MAGE_REMOTE_RUN_DEFAULT_COUNTRY = 'CA';
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

        delete process.env.MAGE_REMOTE_RUN_DEFAULT_COUNTRY;
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

        expect(mockClient.get).toHaveBeenCalledWith('V1/company/role', {
            'searchCriteria[currentPage]': '1',
            'searchCriteria[pageSize]': '20'
        });
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

    it('list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('List failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'list']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('show: should handle company not found error', async () => {
        mockClient.get.mockRejectedValue(new Error('Not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'show', '999']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('show: should output json format', async () => {
        mockClient.get.mockResolvedValue({ id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1 });

        await program.parseAsync(['node', 'test', 'company', 'show', '1', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"company_name"'));
    });

    it('show: should display payment methods when present', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1,
            extension_attributes: {
                applicable_payment_method: ['checkmo', 'free']
            }
        });

        await program.parseAsync(['node', 'test', 'company', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Payment Methods'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('checkmo, free'));
    });

    it('show: should display "None" when payment methods list is empty', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1,
            extension_attributes: { applicable_payment_method: [] }
        });

        await program.parseAsync(['node', 'test', 'company', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('None'));
    });

    it('update: should handle company not found error', async () => {
        mockClient.get.mockRejectedValue(new Error('Not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'update', '999']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('delete: should not delete when cancelled', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: false });

        await program.parseAsync(['node', 'test', 'company', 'delete', '1']);

        expect(mockClient.delete).not.toHaveBeenCalled();
    });

    it('delete: should delete with --force flag (no prompt)', async () => {
        mockClient.delete.mockResolvedValue({});

        await program.parseAsync(['node', 'test', 'company', 'delete', '1', '--force']);

        expect(mockClient.delete).toHaveBeenCalledWith('V1/company/1');
        expect(inquirer.default.prompt).not.toHaveBeenCalled();
    });

    it('role show: should show role details with permissions', async () => {
        mockClient.get.mockResolvedValue({
            role_id: 1, role_name: 'Manager',
            permissions: [
                { resource_id: 'Magento_Company::company', permission: 'allow' }
            ]
        });

        await program.parseAsync(['node', 'test', 'company', 'role', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Manager'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Magento_Company::company'));
    });

    it('role show: should show role without permissions', async () => {
        mockClient.get.mockResolvedValue({ role_id: 2, role_name: 'Viewer' });

        await program.parseAsync(['node', 'test', 'company', 'role', 'show', '2']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Viewer'));
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
            'searchCriteria[filter_groups][0][filters][0][field]': 'company_credit_id',
            'searchCriteria[filter_groups][0][filters][0][value]': '55'
        }));
    });

    it('credit history: should show "No history found" when empty', async () => {
        mockClient.get.mockResolvedValueOnce({ id: 55 });
        mockClient.get.mockResolvedValueOnce({ items: [], total_count: 0 });

        await program.parseAsync(['node', 'test', 'company', 'credit', 'history', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No history found'));
    });

    it('credit history: should handle credit profile not found', async () => {
        mockClient.get.mockRejectedValue(new Error('Not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'history', '999']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('credit increase: should prompt for creditId and amount when not provided', async () => {
        mockClient.get.mockResolvedValue({ currency_code: 'USD' });
        mockClient.post.mockResolvedValue({});
        inquirer.default.prompt
            .mockResolvedValueOnce({ creditId: '5' })
            .mockResolvedValueOnce({ amount: '100' });
        select.mockResolvedValueOnce(2); // operation type

        await program.parseAsync(['node', 'test', 'company', 'credit', 'increase']);

        expect(inquirer.default.prompt).toHaveBeenCalledTimes(2);
        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/5/increaseBalance', expect.anything());
    });

    it('credit increase: should prompt for currency when fetch fails', async () => {
        mockClient.get.mockRejectedValue(new Error('Credit not found'));
        mockClient.post.mockResolvedValue({});
        inquirer.default.prompt.mockResolvedValueOnce({ currency: 'EUR' });

        await program.parseAsync(['node', 'test', 'company', 'credit', 'increase', '1', '50']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/1/increaseBalance',
            expect.objectContaining({ currency: 'EUR' })
        );
    });

    it('credit decrease: should prompt for creditId and amount when not provided', async () => {
        mockClient.get.mockResolvedValue({ currency_code: 'USD' });
        mockClient.post.mockResolvedValue({});
        inquirer.default.prompt
            .mockResolvedValueOnce({ creditId: '7' })
            .mockResolvedValueOnce({ amount: '50' });
        select.mockResolvedValueOnce(3); // operation type

        await program.parseAsync(['node', 'test', 'company', 'credit', 'decrease']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/7/decreaseBalance', expect.anything());
    });

    it('credit decrease: should prompt for currency when fetch fails', async () => {
        mockClient.get.mockRejectedValue(new Error('Credit not found'));
        mockClient.post.mockResolvedValue({});
        inquirer.default.prompt.mockResolvedValueOnce({ currency: 'GBP' });

        await program.parseAsync(['node', 'test', 'company', 'credit', 'decrease', '2', '30']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/companyCredits/2/decreaseBalance',
            expect.objectContaining({ currency: 'GBP' })
        );
    });

    it('list: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, company_name: 'Acme', company_email: 'info@acme.com', status: 1 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'company', 'list', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"company_name"'));
    });

    it('create: should handle errors', async () => {
        inquirer.default.prompt.mockResolvedValue({ company_name: 'New Co', company_email: 'new@co.com' });
        mockClient.post.mockRejectedValue(new Error('Create failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'create']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('delete: should handle errors', async () => {
        inquirer.default.prompt.mockResolvedValue({ confirm: true });
        mockClient.delete.mockRejectedValue(new Error('Delete failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'delete', '1']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('structure: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'structure', '1']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('role list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('List failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'role', 'list']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('role show: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Role not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'role', 'show', '999']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('credit show: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Credit not found'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'show', '999']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('credit increase: should handle errors', async () => {
        mockClient.get.mockResolvedValue({ currency_code: 'USD' });
        mockClient.post.mockRejectedValue(new Error('Increase failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'increase', '1', '50']);

        expect(errorSpy).toHaveBeenCalled();
    });

    it('credit decrease: should handle errors', async () => {
        mockClient.get.mockResolvedValue({ currency_code: 'USD' });
        mockClient.post.mockRejectedValue(new Error('Decrease failed'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'company', 'credit', 'decrease', '1', '25']);

        expect(errorSpy).toHaveBeenCalled();
    });
});
