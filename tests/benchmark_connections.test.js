import { jest } from '@jest/globals';
import { Command } from 'commander';

// Define mocks using unstable_mockModule
jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn(),
    saveConfig: jest.fn(),
    addProfile: jest.fn(),
    getActiveProfile: jest.fn(),
    clearTokenCache: jest.fn()
}));

jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/prompts.js', () => ({
    askForProfileSettings: jest.fn()
}));

jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn(),
    confirm: jest.fn(),
    select: jest.fn()
}));

jest.unstable_mockModule('inquirer', () => ({
    default: {
        prompt: jest.fn()
    },
    prompt: jest.fn()
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
        hex: () => (t) => t,
    }
}));

jest.unstable_mockModule('cli-table3', () => ({
    default: jest.fn().mockImplementation(() => ({
        push: jest.fn(),
        toString: jest.fn(() => 'MOCK_TABLE')
    }))
}));

jest.unstable_mockModule('csv-stringify/sync', () => ({
    stringify: jest.fn(() => 'MOCK_CSV')
}));

// Dynamic imports
const configMod = await import('../lib/config.js');
const factoryMod = await import('../lib/api/factory.js');
const { registerConnectionCommands } = await import('../lib/commands/connections.js');

describe('Connection List Benchmark', () => {
    let program;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        program = new Command();
        registerConnectionCommands(program);
        // We want to see the benchmark output, so we won't mock console.log for the benchmark itself
        // But the command uses console.log for output, so we should spy it but maybe allow it to print specific things?
        // Easier: just spy it and inspect it later, or use process.stderr.write for our benchmark log.
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should benchmark sequential vs parallel profile checks', async () => {
        const PROFILE_COUNT = 20;
        const NETWORK_DELAY = 50; // ms

        // Create profiles that require checks (e.g. ac-cloud-paas without b2bModulesAvailable)
        const profiles = {};
        for (let i = 0; i < PROFILE_COUNT; i++) {
            profiles[`Profile${i}`] = { type: 'ac-cloud-paas', url: `http://test${i}.com` };
        }

        configMod.loadConfig.mockResolvedValue({
            profiles: profiles,
            activeProfile: 'Profile0'
        });

        // Mock client to simulate network delay
        const mockClient = {
            get: jest.fn().mockImplementation(async () => {
                await new Promise(resolve => setTimeout(resolve, NETWORK_DELAY));
                return ['Magento_Company'];
            })
        };
        factoryMod.createClient.mockResolvedValue(mockClient);

        const start = Date.now();
        await program.parseAsync(['node', 'test', 'connection', 'list']);
        const duration = Date.now() - start;

        process.stderr.write(`\nBENCHMARK_RESULT: ${duration}ms (Profiles: ${PROFILE_COUNT}, Delay: ${NETWORK_DELAY}ms)\n`);

        // We expect calls
        expect(mockClient.get).toHaveBeenCalledTimes(PROFILE_COUNT);
    }, 30000); // Increase timeout
});
