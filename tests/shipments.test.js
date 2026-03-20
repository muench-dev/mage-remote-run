import { jest } from '@jest/globals';
import { Command } from 'commander';
// Mock everything needed
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/utils.js', () => ({
    printTable: jest.fn(),
    handleError: jest.fn(),
    buildPaginationCriteria: jest.fn().mockReturnValue({
        'searchCriteria[currentPage]': '1',
        'searchCriteria[pageSize]': '20'
    }),
    buildSearchCriteria: jest.fn().mockImplementation((opts) => {
        const params = {};
        if (opts.filter && opts.filter.includes('order_id=123')) {
            params['searchCriteria[filter_groups][0][filters][0][field]'] = 'order_id';
            params['searchCriteria[filter_groups][0][filters][0][value]'] = '123';
            params['searchCriteria[filter_groups][0][filters][0][condition_type]'] = 'eq';
        }
        return { params };
    }),
    buildSortCriteria: jest.fn().mockReturnValue({ params: {} }),
    addPaginationOptions: jest.fn().mockImplementation(cmd => cmd),
    addFilterOption: jest.fn().mockImplementation(cmd => cmd),
    addSortOption: jest.fn().mockImplementation(cmd => cmd),
    addPaginationOptions: jest.fn().mockImplementation(cmd => cmd),
    addFormatOption: jest.fn().mockImplementation(cmd => cmd.option('-f, --format <type>', 'Output format (text, json, xml)', 'text')),
    getFormatHeaders: jest.fn().mockImplementation(options => {
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';
        return headers;
    }),
    formatOutput: jest.fn().mockImplementation((options, data) => {
        if (options.format === 'json') { console.log(JSON.stringify(data, null, 2)); return true; }
        if (options.format === 'xml') { console.log(data); return true; }
        return false;
    })
}));

jest.unstable_mockModule('inquirer', () => ({
    default: { prompt: jest.fn() }
}));

const { createClient } = await import('../lib/api/factory.js');
const { printTable, handleError } = await import('../lib/utils.js');
const { registerShipmentCommands } = await import('../lib/commands/shipments.js');

describe('Shipment Commands', () => {
    let program;
    let mockClient;
    let consoleSpy;

    beforeEach(() => {
        program = new Command();
        mockClient = {
            get: jest.fn(),
            post: jest.fn()
        };
        createClient.mockResolvedValue(mockClient);
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleSpy.mockRestore();
    });

    test('list shipments', async () => {
        registerShipmentCommands(program);
        mockClient.get.mockResolvedValue({
            items: [{ entity_id: 1, increment_id: '001', order_id: 10, total_qty: 2, created_at: '2023-01-01' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'shipment', 'list']);

        expect(createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/shipments', expect.objectContaining({
            'searchCriteria[currentPage]': '1'
        }), expect.anything());
        expect(printTable).toHaveBeenCalled();
    });

    test('list shipments filtered by order id', async () => {
        registerShipmentCommands(program);
        mockClient.get.mockResolvedValue({
            items: [],
            total_count: 0
        });

        await program.parseAsync(['node', 'test', 'shipment', 'list', '--order-id', '123']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/shipments', expect.objectContaining({
            'searchCriteria[filter_groups][0][filters][0][field]': 'order_id',
            'searchCriteria[filter_groups][0][filters][0][value]': '123'
        }), expect.anything());
    });

    test('show shipment', async () => {
        registerShipmentCommands(program);
        mockClient.get.mockResolvedValue({
            entity_id: 1,
            increment_id: '001',
            order_id: 10,
            items: [],
            tracks: [],
            comments: []
        });

        await program.parseAsync(['node', 'test', 'shipment', 'show', '1']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/shipment/1', {}, expect.anything());
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Shipment Information'));
    });

    test('create shipment', async () => {
        registerShipmentCommands(program);
        mockClient.post.mockResolvedValue(100);

        await program.parseAsync(['node', 'test', 'shipment', 'create', '10', '--notify']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/order/10/ship', expect.objectContaining({
            notify: true
        }));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Shipment created'));
    });

    test('add tracking', async () => {
        registerShipmentCommands(program);
        mockClient.post.mockResolvedValue(55);

        await program.parseAsync(['node', 'test', 'shipment', 'track', '100', '--carrier', 'fedex', '--title', 'FedEx', '--number', '123']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/shipment/track', expect.objectContaining({
            entity: expect.objectContaining({
                parent_id: '100',
                carrier_code: 'fedex'
            })
        }));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Tracking added'));
    });

    test('send email', async () => {
        registerShipmentCommands(program);
        mockClient.post.mockResolvedValue(true);

        await program.parseAsync(['node', 'test', 'shipment', 'email', '100']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/shipment/100/emails');
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Email sent'));
    });

    test('add comment', async () => {
        registerShipmentCommands(program);
        mockClient.post.mockResolvedValue({ entity_id: 99 });

        await program.parseAsync(['node', 'test', 'shipment', 'comments', '100', '--comment', 'Foo']);

        expect(mockClient.post).toHaveBeenCalledWith('V1/shipment/100/comments', expect.objectContaining({
            entity: expect.objectContaining({
                comment: 'Foo'
            })
        }));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Comment added'));
    });
});
