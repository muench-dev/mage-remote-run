
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
        bold: (t) => t,
    }
}));

jest.unstable_mockModule('../lib/utils.js', () => ({
    printTable: jest.fn(),
    handleError: jest.fn(),
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

const factoryMod = await import('../lib/api/factory.js');
const { registerModulesCommands } = await import('../lib/commands/modules.js');
const utilsMod = await import('../lib/utils.js');

describe('Module Commands', () => {
    let program;
    let clientMock;
    let logSpy;

    beforeEach(() => {
        program = new Command();
        clientMock = {
            get: jest.fn()
        };
        factoryMod.createClient.mockResolvedValue(clientMock);

        // Mock printTable to avoid error during execution
        utilsMod.printTable.mockImplementation(() => { });
        // Mock handleError to just throw so we can catch it in test or let it fail
        utilsMod.handleError.mockImplementation((e) => { throw e; });

        logSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('module list command should fetch modules and print table', async () => {
        registerModulesCommands(program);

        const mockModules = ['Magento_Store', 'Magento_Catalog'];
        clientMock.get.mockResolvedValue(mockModules);

        await program.parseAsync(['node', 'test', 'module', 'list']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(clientMock.get).toHaveBeenCalledWith('V1/modules', {}, { headers: {} });
        expect(utilsMod.printTable).toHaveBeenCalledWith(['Module'], [['Magento_Store'], ['Magento_Catalog']]);
    });

    test('module list command json format', async () => {
        registerModulesCommands(program);

        const mockModules = ['Magento_Store'];
        clientMock.get.mockResolvedValue(mockModules);

        await program.parseAsync(['node', 'test', 'module', 'list', '--format', 'json']);

        expect(clientMock.get).toHaveBeenCalledWith('V1/modules', {}, { headers: { 'Accept': 'application/json' } });
        expect(logSpy).toHaveBeenCalledWith(JSON.stringify(mockModules, null, 2));
    });

    test('module list command xml format', async () => {
        registerModulesCommands(program);

        const mockXml = '<response><item>Magento_Store</item></response>';
        clientMock.get.mockResolvedValue(mockXml);

        await program.parseAsync(['node', 'test', 'module', 'list', '--format', 'xml']);

        expect(clientMock.get).toHaveBeenCalledWith('V1/modules', {}, { headers: { 'Accept': 'application/xml' } });
        expect(logSpy).toHaveBeenCalledWith(mockXml);
    });

    test('module list command handles API error', async () => {
        registerModulesCommands(program);

        const error = new Error('API Error');
        clientMock.get.mockRejectedValue(error);

        await expect(program.parseAsync(['node', 'test', 'module', 'list'])).rejects.toThrow('API Error');

        expect(utilsMod.handleError).toHaveBeenCalledWith(error);
    });

    test('module list command handles unexpected data format', async () => {
        registerModulesCommands(program);

        const unexpectedData = { foo: 'bar' }; // Not an array
        clientMock.get.mockResolvedValue(unexpectedData);

        await program.parseAsync(['node', 'test', 'module', 'list']);

        expect(logSpy).toHaveBeenCalledWith(unexpectedData);
        expect(utilsMod.printTable).not.toHaveBeenCalled();
    });
});
