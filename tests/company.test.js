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
        bold: Object.assign((msg) => msg, { blue: (msg) => msg, underline: (msg) => msg }),
        gray: (msg) => msg,
        cyan: (msg) => msg,
        green: (msg) => msg,
        red: (msg) => msg
    }
}));

const { createClient } = await import('../lib/api/factory.js');
const { printTable, handleError } = await import('../lib/utils.js');
const { registerCompanyCommands } = await import('../lib/commands/company.js');
const { Command } = await import('commander');

describe('Company Commands', () => {
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

        registerCompanyCommands(program);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('company list', () => {
        it('should list companies with default options', async () => {
            const mockData = {
                items: [
                    { id: 1, company_name: 'Acme Corp', company_email: 'info@acme.com', status: 1, sales_representative_id: 5 }
                ],
                total_count: 1
            };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'company', 'list']);

            expect(createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/company', expect.objectContaining({
                'searchCriteria[currentPage]': '1',
                'searchCriteria[pageSize]': '20'
            }), expect.any(Object));
            expect(printTable).toHaveBeenCalledWith(
                ['ID', 'Name', 'Email', 'Status', 'Sales Rep ID'],
                [[1, 'Acme Corp', 'info@acme.com', 1, 5]]
            );
        });

        it('should list companies in JSON format', async () => {
            const mockData = { items: [], total_count: 0 };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'company', 'list', '--format', 'json']);

            expect(mockClient.get).toHaveBeenCalled();
            // JSON.stringify check implicitly
            expect(console.log).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });
    });

    describe('company show', () => {
        it('should show company details', async () => {
            const mockData = {
                id: 1,
                company_name: 'Acme Corp',
                company_email: 'info@acme.com',
                status: 1,
                sales_representative_id: 5,
                street: '123 Main St',
                city: 'Anytown',
                region: 'CA',
                postcode: '90210',
                country_id: 'US',
                telephone: '555-1234',
                extension_attributes: {
                    applicable_payment_method: ['checkmo']
                }
            };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'company', 'show', '1']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/company/1', {}, expect.any(Object));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Acme Corp'));
        });

        it('should handle company not found', async () => {
            mockClient.get.mockRejectedValue(new Error('Not found'));

            await program.parseAsync(['node', 'test', 'company', 'show', '999']);

            expect(handleError).toHaveBeenCalled();
        });
    });
});
