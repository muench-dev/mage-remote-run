import { jest } from '@jest/globals';

// Mock chalk
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

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    }
}));

jest.unstable_mockModule('os', () => ({
    default: {
        homedir: jest.fn().mockReturnValue('/home/user')
    }
}));

jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn()
}));

const {
    handleError, readInput, validateAdobeCommerce, validatePaaSOrOnPrem,
    printTable, buildSearchCriteria, printAddress
} = await import('../lib/utils.js');
const fs = (await import('fs')).default;
const os = (await import('os')).default;
const configMod = await import('../lib/config.js');

describe('handleError', () => {
    let consoleErrorSpy;

    beforeEach(() => {
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should log regular error messages as is', () => {
        const error = new Error('Regular error');
        handleError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Regular error');
    });

    it('should format Magento API JSON errors', () => {
        const jsonError = JSON.stringify({
            message: "No such entity with %fieldName = %fieldValue",
            parameters: {
                fieldName: "salesRepresentativeId",
                fieldValue: 1000
            }
        });
        const error = new Error(`API Error 404: ${jsonError}`);

        handleError(error);

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'No such entity with salesRepresentativeId = 1000');
    });

    it('should fall back to original message if JSON parsing fails', () => {
        const error = new Error('API Error 500: Invalid JSON');
        handleError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'API Error 500: Invalid JSON');
    });

    it('should log error object in debug mode', () => {
        process.env.DEBUG = 'true';
        const error = new Error('Debug error');
        handleError(error);
        expect(consoleErrorSpy).toHaveBeenCalledWith(error);
        delete process.env.DEBUG;
    });
});

describe('readInput', () => {
    let originalStdin;

    beforeEach(() => {
        originalStdin = process.stdin;
    });

    afterEach(() => {
        Object.defineProperty(process, 'stdin', {
            value: originalStdin,
            configurable: true
        });
        jest.clearAllMocks();
    });

    it('should read file content when filePath is provided', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('file content');

        const result = await readInput('test.txt');

        expect(fs.existsSync).toHaveBeenCalledWith('test.txt');
        expect(fs.readFileSync).toHaveBeenCalledWith('test.txt', 'utf8');
        expect(result).toBe('file content');
    });

    it('should expand tilde in filePath', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('home content');
        os.homedir.mockReturnValue('/home/user');

        const result = await readInput('~/test.txt');

        expect(fs.existsSync).toHaveBeenCalledWith('/home/user/test.txt');
        expect(fs.readFileSync).toHaveBeenCalledWith('/home/user/test.txt', 'utf8');
        expect(result).toBe('home content');
    });

    it('should expand tilde only as filePath', async () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('home only content');
        os.homedir.mockReturnValue('/home/user');

        const result = await readInput('~');

        expect(fs.existsSync).toHaveBeenCalledWith('/home/user');
        expect(fs.readFileSync).toHaveBeenCalledWith('/home/user', 'utf8');
        expect(result).toBe('home only content');
    });

    it('should throw error if file does not exist', async () => {
        fs.existsSync.mockReturnValue(false);

        await expect(readInput('non-existent.txt')).rejects.toThrow('File not found: non-existent.txt');
    });

    it('should read from stdin if no filePath and isTTY is false', async () => {
        const mockStdin = {
            isTTY: false,
            [Symbol.asyncIterator]: async function* () {
                yield 'chunk1';
                yield 'chunk2';
            }
        };

        Object.defineProperty(process, 'stdin', {
            value: mockStdin,
            configurable: true
        });

        const result = await readInput();

        expect(result).toBe('chunk1chunk2');
    });

    it('should return null if no filePath and isTTY is true', async () => {
        const mockStdin = {
            isTTY: true
        };

        Object.defineProperty(process, 'stdin', {
            value: mockStdin,
            configurable: true
        });

        const result = await readInput();

        expect(result).toBeNull();
    });
});

describe('validateAdobeCommerce', () => {
    test.each(['ac-cloud-paas', 'ac-saas', 'ac-on-prem'])('should not throw if profile type is %s', async (type) => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type }
            }
        });

        await expect(validateAdobeCommerce()).resolves.not.toThrow();
    });

    test.each(['magento-os', 'unknown-type'])('should throw if profile type is %s', async (type) => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type }
            }
        });

        await expect(validateAdobeCommerce()).rejects.toThrow('This command is only available for Adobe Commerce (Cloud, SaaS, On-Premise).');
    });

    it('should throw if no active profile', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: null,
            profiles: {}
        });

        await expect(validateAdobeCommerce()).rejects.toThrow('This command is only available for Adobe Commerce (Cloud, SaaS, On-Premise).');
    });
});

describe('validatePaaSOrOnPrem', () => {
    test.each(['ac-cloud-paas', 'ac-on-prem'])('should not throw if profile type is %s', async (type) => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type }
            }
        });

        await expect(validatePaaSOrOnPrem()).resolves.not.toThrow();
    });

    test.each(['ac-saas', 'magento-os', 'unknown-type'])('should throw if profile type is %s', async (type) => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type }
            }
        });

        await expect(validatePaaSOrOnPrem()).rejects.toThrow('This command is only available for Adobe Commerce (Cloud/On-Premise).');
    });

    it('should throw if no active profile', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: null,
            profiles: {}
        });

        await expect(validatePaaSOrOnPrem()).rejects.toThrow('This command is only available for Adobe Commerce (Cloud/On-Premise).');
    });
});

describe('printTable', () => {
    let consoleLogSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it('should print a table with headers and data', () => {
        const headers = ['ID', 'Name'];
        const data = [['1', 'Alice'], ['2', 'Bob']];

        printTable(headers, data);

        expect(consoleLogSpy).toHaveBeenCalled();
        const output = consoleLogSpy.mock.calls[0][0];
        // Verify content
        expect(output).toContain('ID');
        expect(output).toContain('Name');
        expect(output).toContain('1');
        expect(output).toContain('Alice');
        expect(output).toContain('2');
        expect(output).toContain('Bob');
    });

    it('should handle empty data', () => {
        const headers = ['ID', 'Name'];
        const data = [];

        printTable(headers, data);

        expect(consoleLogSpy).toHaveBeenCalled();
        const output = consoleLogSpy.mock.calls[0][0];
        expect(output).toContain('ID');
        expect(output).toContain('Name');
    });
});

describe('buildSearchCriteria', () => {
    let originalConsoleError;

    beforeEach(() => {
        originalConsoleError = console.error;
        console.error = jest.fn();
    });

    afterEach(() => {
        console.error = originalConsoleError;
    });

    it('should build pagination criteria', () => {
        const result = buildSearchCriteria({ page: 2, size: 50 });
        expect(result.params).toMatchObject({
            'searchCriteria[currentPage]': 2,
            'searchCriteria[pageSize]': 50
        });
    });

    it('should parse simple equality filter', () => {
        const result = buildSearchCriteria({ filter: ['status=1'] });
        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'status',
            'searchCriteria[filter_groups][0][filters][0][value]': '1',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq'
        });
    });

    it('should parse shorthand operators', () => {
        const result = buildSearchCriteria({ filter: ['price>=10'] });
        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'price',
            'searchCriteria[filter_groups][0][filters][0][value]': '10',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'gteq'
        });
    });

    it('should parse explicit operators', () => {
        const result = buildSearchCriteria({ filter: ['status:in=1,2,3', 'name:notnull'] });
        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'status',
            'searchCriteria[filter_groups][0][filters][0][value]': '1,2,3',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'in',
            'searchCriteria[filter_groups][1][filters][0][field]': 'name',
            'searchCriteria[filter_groups][1][filters][0][value]': '',
            'searchCriteria[filter_groups][1][filters][0][condition_type]': 'notnull'
        });
    });

    it('should map wildcard character to percent for like operator', () => {
        const result = buildSearchCriteria({ filter: ['name:like=*test*'] });
        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'name',
            'searchCriteria[filter_groups][0][filters][0][value]': '%test%',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like'
        });
    });

    it('should parse newly added shorthand operators', () => {
        const result = buildSearchCriteria({
            filter: [
                'status!=canceled',
                'name~*shirt*',
                'name!~*shirt*',
                'category_ids@@3',
                'updated_at?',
                'created_at!',
                'entity_id:!in=1,2,3'
            ]
        });

        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'status',
            'searchCriteria[filter_groups][0][filters][0][value]': 'canceled',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'neq',
            'searchCriteria[filter_groups][1][filters][0][field]': 'name',
            'searchCriteria[filter_groups][1][filters][0][value]': '%shirt%',
            'searchCriteria[filter_groups][1][filters][0][condition_type]': 'like',
            'searchCriteria[filter_groups][2][filters][0][field]': 'name',
            'searchCriteria[filter_groups][2][filters][0][value]': '%shirt%',
            'searchCriteria[filter_groups][2][filters][0][condition_type]': 'nlike',
            'searchCriteria[filter_groups][3][filters][0][field]': 'category_ids',
            'searchCriteria[filter_groups][3][filters][0][value]': '3',
            'searchCriteria[filter_groups][3][filters][0][condition_type]': 'finset',
            'searchCriteria[filter_groups][4][filters][0][field]': 'updated_at',
            'searchCriteria[filter_groups][4][filters][0][value]': '1',
            'searchCriteria[filter_groups][4][filters][0][condition_type]': 'null',
            'searchCriteria[filter_groups][5][filters][0][field]': 'created_at',
            'searchCriteria[filter_groups][5][filters][0][value]': '1',
            'searchCriteria[filter_groups][5][filters][0][condition_type]': 'notnull',
            'searchCriteria[filter_groups][6][filters][0][field]': 'entity_id',
            'searchCriteria[filter_groups][6][filters][0][value]': '1,2,3',
            'searchCriteria[filter_groups][6][filters][0][condition_type]': 'nin'
        });
    });

    it('should parse OR filters within the same group using ||', () => {
        const result = buildSearchCriteria({ filter: ['sku:like=DRONE-* || price>100'] });
        expect(result.params).toMatchObject({
            'searchCriteria[filter_groups][0][filters][0][field]': 'sku',
            'searchCriteria[filter_groups][0][filters][0][value]': 'DRONE-%',
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like',
            'searchCriteria[filter_groups][0][filters][1][field]': 'price',
            'searchCriteria[filter_groups][0][filters][1][value]': '100',
            'searchCriteria[filter_groups][0][filters][1][condition_type]': 'gt'
        });
    });

    it('should warn on invalid filter format', () => {
        buildSearchCriteria({ filter: ['invalid_filter'] });
        expect(console.error).toHaveBeenCalled();
    });
});

describe('printAddress', () => {
    let consoleLogSpy;

    beforeEach(() => {
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
    });

    it('should print full address with default indentation', () => {
        const addr = {
            firstname: 'John',
            lastname: 'Doe',
            street: ['123 Main St', 'Suite 100'],
            city: 'Austin',
            region: 'Texas',
            postcode: '78701',
            country_id: 'US',
            telephone: '555-1234'
        };

        printAddress(addr);

        expect(consoleLogSpy).toHaveBeenCalledWith('  John Doe');
        expect(consoleLogSpy).toHaveBeenCalledWith('  123 Main St');
        expect(consoleLogSpy).toHaveBeenCalledWith('  Suite 100');
        expect(consoleLogSpy).toHaveBeenCalledWith('  Austin, Texas, 78701');
        expect(consoleLogSpy).toHaveBeenCalledWith('  US');
        expect(consoleLogSpy).toHaveBeenCalledWith('  T: 555-1234');
    });

    it('should handle missing fields and zero indentation', () => {
        const addr = {
            firstname: 'Jane',
            lastname: 'Smith',
            city: 'London',
            country_id: 'GB'
        };

        printAddress(addr, 0);

        expect(consoleLogSpy).toHaveBeenCalledWith('Jane Smith');
        expect(consoleLogSpy).toHaveBeenCalledWith('London');
        expect(consoleLogSpy).toHaveBeenCalledWith('GB');
        expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('T:'));
    });

    it('should handle region object', () => {
        const addr = {
            firstname: 'A',
            lastname: 'B',
            city: 'C',
            region: { region_code: 'NY' },
            postcode: '10001'
        };

        printAddress(addr, 0);
        expect(consoleLogSpy).toHaveBeenCalledWith('C, NY, 10001');
    });

    it('should print empty message for empty address', () => {
        printAddress({}, 2);
        expect(consoleLogSpy).toHaveBeenCalledWith('  (Empty Address)');
    });

    it('should return early if no address provided', () => {
        printAddress(null);
        expect(consoleLogSpy).not.toHaveBeenCalled();
    });
});
