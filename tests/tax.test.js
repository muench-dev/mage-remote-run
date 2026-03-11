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
        bold: Object.assign((t) => t, {
            blue: (t) => t
        }),
        magenta: (t) => t,
    }
}));

jest.unstable_mockModule('cli-table3', () => ({
    default: jest.fn().mockImplementation(() => ({
        push: jest.fn(),
        toString: jest.fn(() => 'MOCK_TABLE')
    }))
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerTaxCommands } = await import('../lib/commands/tax.js');

describe('Tax Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerTaxCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            get: jest.fn(),
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('tax class list', () => {
        it('should list tax classes', async () => {
            mockClient.get.mockResolvedValue({
                items: [{ class_id: 1, class_name: 'Retail Customer', class_type: 'CUSTOMER' }],
                total_count: 1
            });

            await program.parseAsync(['node', 'test', 'tax', 'class', 'list']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total: 1'));
        });

        it('should handle format JSON output', async () => {
            const mockData = { items: [{ class_id: 1 }] };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'tax', 'class', 'list', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });

        it('should output empty table when items is null', async () => {
            mockClient.get.mockResolvedValue({ total_count: 0 });

            await program.parseAsync(['node', 'test', 'tax', 'class', 'list']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should handle errors', async () => {
            const error = new Error('API Error');
            mockClient.get.mockRejectedValue(error);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await program.parseAsync(['node', 'test', 'tax', 'class', 'list']);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });
    });

    describe('tax class show', () => {
        it('should show tax class details', async () => {
            mockClient.get.mockResolvedValue({
                class_id: 2,
                class_name: 'Taxable Goods',
                class_type: 'PRODUCT'
            });

            await program.parseAsync(['node', 'test', 'tax', 'class', 'show', '2']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tax Class Details:'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Taxable Goods'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PRODUCT'));
        });

        it('should handle format JSON output', async () => {
            const mockData = { class_id: 2, class_name: 'Taxable Goods' };
            mockClient.get.mockResolvedValue(mockData);

            await program.parseAsync(['node', 'test', 'tax', 'class', 'show', '2', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        });

        it('should handle errors', async () => {
            const error = new Error('API Error');
            mockClient.get.mockRejectedValue(error);
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await program.parseAsync(['node', 'test', 'tax', 'class', 'show', '2']);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error');
        });
    });
});
