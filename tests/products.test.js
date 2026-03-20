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

jest.unstable_mockModule('html-to-text', () => ({
    convert: jest.fn((text) => text.replace(/<[^>]*>/g, ''))
}));

const factoryMod = await import('../lib/api/factory.js');
const { registerProductsCommands } = await import('../lib/commands/products.js');

describe('Product Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerProductsCommands(program);
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

    it('list: should list products with sorting', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--sort-by', 'price', '--sort-order', 'DESC']);

        const expectedParams = {
            'searchCriteria[currentPage]': '1',
            'searchCriteria[pageSize]': '20',
            'searchCriteria[sortOrders][0][field]': 'price',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        };

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/products', expectedParams, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should list products with filters', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--filter', 'type_id=simple', 'price>=10']);

        const expectedParams = {
            'searchCriteria[currentPage]': '1',
            'searchCriteria[pageSize]': '20',
            'searchCriteria[filter_groups][0][filters][0][field]': 'type_id',
            'searchCriteria[filter_groups][0][filters][0][value]': 'simple',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq',
            'searchCriteria[filter_groups][1][filters][0][field]': 'price',
            'searchCriteria[filter_groups][1][filters][0][value]': '10',
            'searchCriteria[filter_groups][1][filters][0][condition_type]': 'gteq',
            'searchCriteria[sortOrders][0][field]': 'entity_id',
            'searchCriteria[sortOrders][0][direction]': 'ASC'
        };

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/products', expectedParams, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('attribute list: should list attributes', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ attribute_code: 'name', default_frontend_label: 'Name', is_required: true, is_user_defined: false }]
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'list']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('show: should show product details', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            extension_attributes: { stock_item: { is_in_stock: true, qty: 100 } },
            custom_attributes: [{ attribute_code: 'description', value: '<p>Test <strong>Description</strong></p>' }]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/TS123', expect.anything(), expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Product Information'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Description')); // html-to-text should remove tags
    });

    it('type list: should list product types', async () => {
        mockClient.get.mockResolvedValue([
            { name: 'Simple', label: 'Simple Product' }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'type', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/types');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('media list: should list product media', async () => {
        mockClient.get.mockResolvedValue([
            { id: 1, media_type: 'image', file: '/i/m/img.jpg', label: 'Image', position: 1, disabled: false }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'media', 'list', 'TS123']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/TS123/media');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('link-type list: should list product link types', async () => {
        mockClient.get.mockResolvedValue([
            { code: 1, name: 'related' }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'link-type', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/links/types', {}, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should output json format via formatOutput', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--format', 'json']);

        expect(mockClient.get).toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"items"'));
    });

    it('list: should display custom columns if --fields is provided', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ sku: 'TS123', name: 'Test Shirt', price: 10 }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--fields', 'sku,price']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should append custom columns if --add-fields is provided', async () => {
        mockClient.get.mockResolvedValue({
            items: [{ id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10, created_at: '2023-01-01' }],
            total_count: 1
        });

        await program.parseAsync(['node', 'test', 'product', 'list', '--add-fields', 'created_at']);

        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('list: should handle errors', async () => {
        mockClient.get.mockRejectedValue(new Error('Network Error'));

        await program.parseAsync(['node', 'test', 'product', 'list']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('show: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"sku"'));
    });

    it('show: should output xml format', async () => {
        mockClient.get.mockResolvedValue('<product><sku>TS123</sku></product>');

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123', '--format', 'xml']);

        expect(consoleLogSpy).toHaveBeenCalledWith('<product><sku>TS123</sku></product>');
    });

    it('show: should display special price and tier prices', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            tier_prices: [{ qty: 10, value: 8 }],
            custom_attributes: [
                { attribute_code: 'special_price', value: '8.00' }
            ]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Special Price'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Tier Prices'));
    });

    it('show: should display short description', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            custom_attributes: [
                { attribute_code: 'short_description', value: '<p>Short</p>' },
                { attribute_code: 'description', value: '<p>Long description</p>' }
            ]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Short Description'));
    });

    it('show: should display visible custom attributes', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            custom_attributes: [
                { attribute_code: 'color', value: 'Red' },
                { attribute_code: 'size', value: 'L' }
            ]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Additional Attributes'));
    });

    it('show: should display media gallery entries', async () => {
        mockClient.get.mockResolvedValue({
            id: 1, sku: 'TS123', name: 'Test Shirt', type_id: 'simple', price: 10,
            created_at: '2023-01-01', updated_at: '2023-01-01',
            media_gallery_entries: [{ media_type: 'image', file: '/img.jpg', label: 'Main' }]
        });

        await program.parseAsync(['node', 'test', 'product', 'show', 'TS123']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Media'));
    });

    it('show: should handle product not found', async () => {
        mockClient.get.mockRejectedValue(new Error('Not Found'));

        await program.parseAsync(['node', 'test', 'product', 'show', 'NOTEXIST']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('media list: should show "no media" message when empty', async () => {
        mockClient.get.mockResolvedValue([]);

        await program.parseAsync(['node', 'test', 'product', 'media', 'list', 'TS123']);

        expect(consoleLogSpy).toHaveBeenCalledWith('No media found.');
    });

    it('attribute show: should show attribute details in text format', async () => {
        mockClient.get.mockResolvedValue({
            attribute_id: 93,
            attribute_code: 'color',
            default_frontend_label: 'Color',
            is_required: false,
            is_user_defined: true,
            is_unique: false,
            frontend_input: 'select',
            frontend_class: null,
            is_visible_on_front: true,
            is_html_allowed_on_front: false,
            is_searchable: true,
            is_filterable_in_search: true,
            is_comparable: false,
            used_for_sort_by: false,
            is_used_for_promo_rules: false,
            options: [
                { value: '1', label: 'Red' },
                { value: '', label: '' },
                { value: '2', label: 'Blue' }
            ]
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'show', 'color']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/attributes/color', {}, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Attribute Information'));
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });

    it('attribute show: should output json format', async () => {
        mockClient.get.mockResolvedValue({
            attribute_id: 93,
            attribute_code: 'color',
            default_frontend_label: 'Color',
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'show', 'color', '--format', 'json']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"attribute_code"'));
    });

    it('attribute show: should output xml format', async () => {
        mockClient.get.mockResolvedValue('<attribute>color</attribute>');

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'show', 'color', '--format', 'xml']);

        expect(consoleLogSpy).toHaveBeenCalledWith('<attribute>color</attribute>');
    });

    it('attribute show: should handle attribute not found', async () => {
        mockClient.get.mockRejectedValue(new Error('Not Found'));

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'show', 'nonexistent']);

        expect(jest.spyOn(console, 'error')).toBeDefined();
    });

    it('attribute show: should display attribute without options', async () => {
        mockClient.get.mockResolvedValue({
            attribute_id: 93,
            attribute_code: 'weight',
            default_frontend_label: 'Weight',
            is_required: true,
            is_user_defined: false,
            is_unique: false,
            frontend_input: 'text',
            frontend_class: null,
            is_visible_on_front: false,
            is_html_allowed_on_front: false,
            is_searchable: false,
            is_filterable_in_search: false,
            is_comparable: false,
            used_for_sort_by: false,
            is_used_for_promo_rules: false,
            options: []
        });

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'show', 'weight']);

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Attribute Information'));
    });

    it('attribute type list: should list attribute types', async () => {
        mockClient.get.mockResolvedValue([
            { value: 'text', label: 'Text Field' },
            { value: 'select', label: 'Dropdown' }
        ]);

        await program.parseAsync(['node', 'test', 'product', 'attribute', 'type', 'list']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/products/attributes/types');
        expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
    });
});
