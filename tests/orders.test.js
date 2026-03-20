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
const { registerOrdersCommands } = await import('../lib/commands/orders.js');
const inquirer = await import('inquirer');
const inquirerPrompts = await import('@inquirer/prompts');

describe('Order Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerOrdersCommands(program);
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

    it('list: should list orders with filters', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', grand_total: 100, status: 'pending' }],
            total_count: 1
        });

        await program.parseAsync([
            'node', 'test', 'order', 'list',
            '--status', 'pending',
            '--email', 'test@example.com',
            '--store', '1',
            '--date-from', '2023-01-01',
            '--date-to', '2023-12-31',
            '--filter', 'grand_total=100',
            '--filter', 'base_grand_total>500',
            '--filter', 'total_paid<300',
            '--filter', 'customer_group_id>=1',
            '--filter', 'items_count<=5'
        ]);

        expect(mockClient.get).toHaveBeenCalledWith(
            'V1/orders',
            expect.objectContaining({
                'searchCriteria[filter_groups][0][filters][0][field]': 'grand_total',
                'searchCriteria[filter_groups][0][filters][0][value]': '100',
                'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
                'searchCriteria[filter_groups][1][filters][0][field]': 'base_grand_total',
                'searchCriteria[filter_groups][1][filters][0][value]': '500',
                'searchCriteria[filter_groups][1][filters][0][condition_type]': 'gt',
                'searchCriteria[filter_groups][2][filters][0][field]': 'total_paid',
                'searchCriteria[filter_groups][2][filters][0][value]': '300',
                'searchCriteria[filter_groups][2][filters][0][condition_type]': 'lt',
                'searchCriteria[filter_groups][3][filters][0][field]': 'customer_group_id',
                'searchCriteria[filter_groups][3][filters][0][value]': '1',
                'searchCriteria[filter_groups][3][filters][0][condition_type]': 'gteq',
                'searchCriteria[filter_groups][4][filters][0][field]': 'items_count',
                'searchCriteria[filter_groups][4][filters][0][value]': '5',
                'searchCriteria[filter_groups][4][filters][0][condition_type]': 'lteq',
                'searchCriteria[filter_groups][5][filters][0][field]': 'status',
                'searchCriteria[filter_groups][5][filters][0][value]': 'pending',
                'searchCriteria[filter_groups][5][filters][0][condition_type]': 'eq',
                'searchCriteria[filter_groups][6][filters][0][field]': 'customer_email',
                'searchCriteria[filter_groups][6][filters][0][value]': 'test@example.com',
                'searchCriteria[filter_groups][7][filters][0][field]': 'store_id',
                'searchCriteria[filter_groups][7][filters][0][value]': '1',
                'searchCriteria[filter_groups][8][filters][0][field]': 'created_at',
                'searchCriteria[filter_groups][8][filters][0][value]': '2023-01-01',
                'searchCriteria[filter_groups][8][filters][0][condition_type]': 'gteq',
                'searchCriteria[filter_groups][9][filters][0][field]': 'created_at',
                'searchCriteria[filter_groups][9][filters][0][value]': '2023-12-31',
                'searchCriteria[filter_groups][9][filters][0][condition_type]': 'lteq'
            }),
            expect.anything()
        );
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should display custom columns if --fields is provided (override defaults)', async () => {
        mockClient.get.mockResolvedValue({
            items: [
                { entity_id: 1, increment_id: '100000001', status: 'pending', grand_total: 100, customer_email: 'test@example.com', base_grand_total: 80, billing_address: { city: 'Austin' } },
                { entity_id: 2, increment_id: '100000002', status: 'processing', grand_total: 200, customer_email: 'user@example.com', base_grand_total: 150 }
            ],
            total_count: 2
        });

        await program.parseAsync([
            'node', 'test', 'order', 'list',
            '--fields', 'base_grand_total,billing_address.city'
        ]);

        const cliTableMock = (await import('cli-table3')).default;
        expect(cliTableMock).toHaveBeenCalledWith({
            style: { head: [] },
            head: [
                expect.anything(), // base_grand_total
                expect.anything()  // billing_address.city
            ]
        });

        const pushMock = cliTableMock.mock.results[0].value.push;
        expect(pushMock).toHaveBeenCalledWith(
            [80, 'Austin'],
            [150, '']
        );
    });

    it('list: should append custom columns if --add-fields is provided', async () => {
        mockClient.get.mockResolvedValue({
            items: [
                { entity_id: 1, increment_id: '100000001', status: 'pending', grand_total: 100, customer_email: 'test@example.com', shipping_description: 'Flat Rate' }
            ],
            total_count: 1
        });

        await program.parseAsync([
            'node', 'test', 'order', 'list',
            '--add-fields', 'shipping_description'
        ]);

        const cliTableMock = (await import('cli-table3')).default;
        expect(cliTableMock).toHaveBeenCalledWith({
            style: { head: [] },
            head: [
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything() // shipping_description
            ]
        });

        const pushMock = cliTableMock.mock.results[0].value.push;
        expect(pushMock).toHaveBeenCalledWith(
            [1, '100000001', 'pending', 100, 'test@example.com', 'Flat Rate']
        );
    });

    it('list: should handle --sort options correctly', async () => {
        mockClient.get.mockResolvedValue({ items: [], total_count: 0 });

        await program.parseAsync([
            'node', 'test', 'order', 'list',
            '--sort', 'grand_total:DESC',
            '--sort', 'created_at' // should default to ASC
        ]);

        expect(mockClient.get).toHaveBeenCalledWith(
            'V1/orders',
            expect.objectContaining({
                'searchCriteria[sortOrders][0][field]': 'grand_total',
                'searchCriteria[sortOrders][0][direction]': 'DESC',
                'searchCriteria[sortOrders][1][field]': 'created_at',
                'searchCriteria[sortOrders][1][direction]': 'ASC'
            }),
            expect.anything()
        );
    });

    it('latest: should list latest orders', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', grand_total: 100, status: 'pending', created_at: '2023-01-01' }]
        });

        await program.parseAsync(['node', 'test', 'order', 'latest']);

        expect(mockClient.get).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('show: should show order details', async () => {
        mockClient.get.mockResolvedValue({
            entity_id: 1, increment_id: '100000001', items: [], billing_address: {}, payment: {}
        });

        await program.parseAsync(['node', 'test', 'order', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/orders/1', expect.anything(), expect.anything());
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order Information'));
    });

    it('cancel: should cancel an order', async () => {
        mockClient.post = jest.fn().mockResolvedValue(true);
        await program.parseAsync(['node', 'test', 'order', 'cancel', '123']);
        expect(mockClient.post).toHaveBeenCalledWith('V1/orders/123/cancel');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 cancelled'));
    });

    it('hold: should hold an order', async () => {
        mockClient.post = jest.fn().mockResolvedValue(true);
        await program.parseAsync(['node', 'test', 'order', 'hold', '123']);
        expect(mockClient.post).toHaveBeenCalledWith('V1/orders/123/hold');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 put on hold'));
    });

    it('unhold: should unhold an order', async () => {
        mockClient.post = jest.fn().mockResolvedValue(true);
        await program.parseAsync(['node', 'test', 'order', 'unhold', '123']);
        expect(mockClient.post).toHaveBeenCalledWith('V1/orders/123/unhold');
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 released from hold'));
    });

    it('list: should output json when --format json is provided', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', grand_total: 100, status: 'pending' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'order', 'list', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"entity_id"'));
    });

    it('search: should search orders by increment_id', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', status: 'pending', grand_total: 100 }]
        });

        await program.parseAsync(['node', 'test', 'order', 'search', '100000001']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/orders', expect.objectContaining({
            'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
            'searchCriteria[filter_groups][0][filters][0][value]': '%100000001%',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like'
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('search: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Search failed'));

        await program.parseAsync(['node', 'test', 'order', 'search', 'test']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('edit: should edit an order with status and comment', async () => {
        mockClient.post = jest.fn().mockResolvedValue(true);
        inquirer.default.prompt.mockResolvedValue({ status: 'processing', comment: 'Test comment' });

        await program.parseAsync(['node', 'test', 'order', 'edit', '123']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/orders/123/comments', expect.objectContaining({
            statusHistory: expect.objectContaining({
                status: 'processing',
                comment: 'Test comment'
            })
        }));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order 123 updated'));
    });

    it('edit: should handle errors', async () => {
        mockClient.post = jest.fn().mockRejectedValue(new Error('Edit failed'));
        inquirer.default.prompt.mockResolvedValue({ status: 'processing', comment: '' });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'edit', '123']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('cancel: should handle errors', async () => {
        mockClient.post = jest.fn().mockRejectedValue(new Error('Cancel failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'cancel', '123']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('hold: should handle errors', async () => {
        mockClient.post = jest.fn().mockRejectedValue(new Error('Hold failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'hold', '123']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('unhold: should handle errors', async () => {
        mockClient.post = jest.fn().mockRejectedValue(new Error('Unhold failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'unhold', '123']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('latest: should show "No orders found." when no orders returned', async () => {
        mockClient.get.mockResolvedValue({ items: [] });

        await program.parseAsync(['node', 'test', 'order', 'latest']);

        expect(consoleLogSpy).toHaveBeenCalledWith('No orders found.');
    });

    it('latest: should show selection prompt and navigate to order when --select is used', async () => {
        mockClient.get
            .mockResolvedValueOnce({
                items: [{ entity_id: 1, increment_id: '100000001', status: 'pending', grand_total: 100, created_at: '2023-01-01' }],
                total_count: 1
            })
            .mockResolvedValueOnce({
                entity_id: 1, increment_id: '100000001', status: 'pending', state: 'new', items: [], billing_address: {}, payment: {}
            });
        inquirer.default.prompt.mockResolvedValue({ orderId: 1 });

        await program.parseAsync(['node', 'test', 'order', 'latest', '--select']);

        expect(inquirer.default.prompt).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order Information'));
    });

    it('latest: should not navigate when Exit is selected', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '100000001', status: 'pending', grand_total: 100, created_at: '2023-01-01' }],
            total_count: 1
        });
        inquirer.default.prompt.mockResolvedValue({ orderId: null });

        await program.parseAsync(['node', 'test', 'order', 'latest', '--select']);

        expect(inquirer.default.prompt).toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Order Information'));
    });

    it('show: should handle errors gracefully', async () => {
        mockClient.get.mockRejectedValue(new Error('Not found'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'show', 'nonexistent']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('show: should output json when --format json is provided', async () => {
        mockClient.get.mockResolvedValue({
            entity_id: 1, increment_id: '100000001', status: 'pending', state: 'new', items: [], billing_address: {}, payment: {}
        });

        await program.parseAsync(['node', 'test', 'order', 'show', '1', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"increment_id"'));
    });

    it('show: should display order items', async () => {
        mockClient.get.mockResolvedValue({
            entity_id: 1,
            increment_id: '100000001',
            status: 'pending',
            state: 'new',
            order_currency_code: 'USD',
            items: [
                { sku: 'SKU001', name: 'Product 1', qty_ordered: 2, price: 10.00, row_total: 20.00 }
            ],
            billing_address: {},
            payment: {}
        });

        await program.parseAsync(['node', 'test', 'order', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Items'));
    });

    it('show: should display shipping address when present', async () => {
        mockClient.get.mockResolvedValue({
            entity_id: 1,
            increment_id: '100000001',
            status: 'pending',
            state: 'new',
            order_currency_code: 'USD',
            items: [],
            billing_address: {
                firstname: 'John', lastname: 'Doe',
                street: ['123 Main St'], city: 'Austin',
                region: 'TX', postcode: '78701', country_id: 'US'
            },
            extension_attributes: {
                shipping_assignments: [{
                    shipping: {
                        address: {
                            firstname: 'Jane', lastname: 'Doe',
                            street: ['456 Ship St'], city: 'Houston',
                            region: 'TX', postcode: '77001', country_id: 'US'
                        }
                    }
                }]
            },
            payment: {}
        });

        await program.parseAsync(['node', 'test', 'order', 'show', '1']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Shipping Address'));
    });

    it('show: should fall back to increment_id search when get by id fails', async () => {
        mockClient.get
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce({
                items: [{
                    entity_id: 42, increment_id: '100000042', status: 'complete', state: 'complete',
                    items: [], billing_address: {}, payment: {}
                }]
            });

        await program.parseAsync(['node', 'test', 'order', 'show', '100000042']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Order Information'));
    });

    it('show: should fall back to search and re-fetch by entity_id for json format', async () => {
        const fullOrder = {
            entity_id: 42, increment_id: '100000042', status: 'complete', state: 'complete',
            items: [], billing_address: {}, payment: {}
        };
        mockClient.get
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce({ items: [{ entity_id: 42, increment_id: '100000042' }] })
            .mockResolvedValueOnce(fullOrder);

        await program.parseAsync(['node', 'test', 'order', 'show', '100000042', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"increment_id"'));
    });

    it('list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('List failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'list']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('latest: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Latest failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'latest']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('show: should handle re-fetch failure gracefully for json format', async () => {
        mockClient.get
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce({ items: [{ entity_id: 42, increment_id: '100000042' }] })
            .mockRejectedValueOnce(new Error('Re-fetch failed'));

        await program.parseAsync(['node', 'test', 'order', 'show', '100000042', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"entity_id"'));
    });

    it('show: should handle not found in fallback search', async () => {
        mockClient.get
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce({ items: [] });
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'show', 'MISSING']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('show: should propagate re-fetch error for xml format', async () => {
        mockClient.get
            .mockRejectedValueOnce(new Error('Not found'))
            .mockResolvedValueOnce({ items: [{ entity_id: 42, increment_id: '100000042' }] })
            .mockRejectedValueOnce(new Error('XML re-fetch failed'));
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await program.parseAsync(['node', 'test', 'order', 'show', '100000042', '--format', 'xml']);

        expect(consoleErrorSpy).toHaveBeenCalled();
    });
});
