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

const factoryMod = await import('../lib/api/factory.js');
const { registerAdobeIoEventsCommands } = await import('../lib/commands/adobe-io-events.js');

describe('Adobe IO Events Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerAdobeIoEventsCommands(program);
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

    it('check-configuration: should check configuration successfully', async () => {
        const mockResponse = { status: 'ok', message: 'Configuration is valid.' };
        mockClient.get.mockResolvedValue(mockResponse);

        await program.parseAsync(['node', 'test', 'adobe-io-event', 'check-configuration']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.get).toHaveBeenCalledWith('V1/adobe_io_events/check_configuration', {}, expect.any(Object));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration Check Result'));

        // Verify table content presence (Key and Value)
        // Since we are using the real printTable (cli-table3), we expect the output to contain the data
        // We use regex to be flexible about whitespace/table borders
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Status/));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/ok/));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Message/));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Configuration is valid/));
    });

    it('check-configuration: should output json format', async () => {
        const mockResponse = { status: 'ok' };
        mockClient.get.mockResolvedValue(mockResponse);

        await program.parseAsync(['node', 'test', 'adobe-io-event', 'check-configuration', '--format', 'json']);

        expect(mockClient.get).toHaveBeenCalledWith('V1/adobe_io_events/check_configuration', {}, expect.objectContaining({ headers: { Accept: 'application/json' } }));
        expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockResponse, null, 2));
    });
});
