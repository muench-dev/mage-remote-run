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

const { handleError, readInput, validateAdobeCommerce, validatePaaSOrOnPrem, printTable } = await import('../lib/utils.js');
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
    it('should not throw if profile type is allowed', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type: 'ac-cloud-paas' }
            }
        });

        await expect(validateAdobeCommerce()).resolves.not.toThrow();
    });

    it('should throw if profile type is not allowed', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type: 'magento-os' }
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
    it('should not throw if profile type is allowed', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type: 'ac-on-prem' }
            }
        });

        await expect(validatePaaSOrOnPrem()).resolves.not.toThrow();
    });

    it('should throw if profile type is not allowed', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                test: { type: 'ac-saas' }
            }
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
