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

jest.unstable_mockModule('cli-table3', () => ({
    default: jest.fn().mockImplementation(() => ({
        push: jest.fn(),
        toString: jest.fn(() => 'MOCK_TABLE')
    }))
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerCartCommands } = await import('../lib/commands/cart.js');

describe('Cart Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerCartCommands(program);
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

    it('list: should display carts', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, is_active: true, items_qty: 2, created_at: '2023-01-01' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'cart', 'list']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/carts/search', expect.any(Object), expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should support filters', async () => {
        mockClient.get.mockResolvedValue({ items: [], total_count: 0 });

        await program.parseAsync(['node', 'test', 'cart', 'list', '--filter', 'is_active:1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/carts/search', expect.objectContaining({
            'searchCriteria[filter_groups][0][filters][0][field]': 'is_active',
            'searchCriteria[filter_groups][0][filters][0][value]': '1'
        }), expect.any(Object));
    });

    it('list: should support sorting', async () => {
        mockClient.get.mockResolvedValue({ items: [], total_count: 0 });

        await program.parseAsync(['node', 'test', 'cart', 'list', '--sort', 'created_at:DESC']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/carts/search', expect.objectContaining({
            'searchCriteria[sortOrders][0][field]': 'created_at',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        }), expect.any(Object));
    });

    it('show: should show cart details including totals and shipping', async () => {
        mockClient.get.mockImplementation((url) => {
            if (url === 'V1/carts/1') {
                return Promise.resolve({
                    id: 1, is_active: true, items_qty: 2, items: [],
                    billing_address: { firstname: 'John', lastname: 'Doe' },
                    extension_attributes: {
                        shipping_assignments: [{
                            shipping: {
                                method: 'flatrate_flatrate',
                                address: { firstname: 'John', lastname: 'Doe' }
                            }
                        }]
                    }
                });
            }
            if (url === 'V1/carts/1/totals') {
                return Promise.resolve({
                    subtotal: 100,
                    tax_amount: 10,
                    grand_total: 110,
                    quote_currency_code: 'USD'
                });
            }
            return Promise.reject('NotFound');
        });

        await program.parseAsync(['node', 'test', 'cart', 'show', '1']);

        // Check calls
        expect(mockClient.get).toHaveBeenCalledWith('V1/carts/1', expect.anything(), expect.any(Object));
        expect(mockClient.get).toHaveBeenCalledWith('V1/carts/1/totals');

        // Check output presence
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Cart Information'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Billing Address:'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Shipping Address'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Totals Breakdown'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Grand Total:'));
    });

    it('show: should handle missing/null values gracefully', async () => {
        mockClient.get.mockImplementation((url) => {
            if (url === 'V1/carts/642') {
                return Promise.resolve({
                    id: 642,
                    customer: {}, // Empty customer object
                    billing_address: {}, // Empty billing address
                    extension_attributes: {
                        shipping_assignments: [{
                            shipping: {
                                address: {} // Empty shipping address
                            }
                        }]
                    }
                });
            }
            if (url === 'V1/carts/642/totals') return Promise.reject('No totals'); // Totals fails
            return Promise.reject('NotFound');
        });

        await program.parseAsync(['node', 'test', 'cart', 'show', '642']);

        // Assertions will be updated after we see the output, but for now we expect it NOT to crash
        // and hopefully NOT print "null null" once fixed.
        // For reproduction, we just want to run this and fail if we were asserting "N/A" but get "null".
        // I will assert what we WANT to see: "N/A" or empty strings instead of null.
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Guest')); // Should fallback to Guest if email missing? or just handle it.
        // Actually, if customer object exists but empty, maybe assume Guest or just print what's available.
        // Let's settle on handling "null null" by checking values.
    });

    it('show: should format addresses correctly with partial data', async () => {
        mockClient.get.mockImplementation((url) => {
            if (url === 'V1/carts/999') {
                return Promise.resolve({
                    id: 999,
                    billing_address: {
                        city: 'New York',
                        region: { region_code: 'NY' },
                        // Missing name, street, postcode, country
                        telephone: '1234567890'
                    },
                    extension_attributes: {
                        shipping_assignments: [{
                            shipping: {
                                address: {
                                    firstname: 'John',
                                    lastname: 'Doe',
                                    street: ['123 Main St'],
                                    // Missing city, region, postcode
                                    country_id: 'US'
                                }
                            }
                        }]
                    }
                });
            }
            return Promise.reject('NotFound');
        });

        await program.parseAsync(['node', 'test', 'cart', 'show', '999']);

        // Billing: City, Region should appear. Name missing. T: phone.
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('New York, NY'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('T: 1234567890'));

        // Shipping: Name, Street, Country.
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('John Doe'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('123 Main St'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('US'));

        // Ensure no "null" or weird commas
        // e.g. ", NY" if city is missing? My logic joins with ", ". 
        // [addr.city, region, addr.postcode].filter(Boolean) handles this.
    });
});
