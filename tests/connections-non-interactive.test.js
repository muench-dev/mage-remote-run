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
        bold: (t) => t,
        hex: () => (t) => t,
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

// Dynamic imports are needed after unstable_mockModule
const configMod = await import('../lib/config.js');
const factoryMod = await import('../lib/api/factory.js');
const promptsMod = await import('../lib/prompts.js');
const inquirerPrompts = await import('@inquirer/prompts');
const utilsMod = await import('../lib/utils.js');
const { registerConnectionCommands } = await import('../lib/commands/connections.js');

describe('Connection Commands (Non-Interactive)', () => {
    let program;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        program = new Command();
        registerConnectionCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should fail if --type is provided but --name is missing', async () => {
        await program.parseAsync(['node', 'test', 'connection', 'add', '--type', 'saas']);
        expect(utilsMod.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Option --name is required') }));
    });

    it('should add a SaaS profile non-interactively', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });
        const mockClient = { get: jest.fn().mockResolvedValue({}) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MySaaS',
            '--type', 'ac-saas',
            '--url', 'https://saas.test',
            '--client-id', 'my-id',
            '--client-secret', 'my-secret',
            '--active'
        ]);

        expect(promptsMod.askForProfileSettings).not.toHaveBeenCalled();
        expect(inquirerPrompts.input).not.toHaveBeenCalled();

        // Verify client creation for testing
        expect(factoryMod.createClient).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: { clientId: 'my-id', clientSecret: 'my-secret' }
        }));

        // Verify save
        expect(configMod.addProfile).toHaveBeenCalledWith('MySaaS', expect.objectContaining({
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: { clientId: 'my-id', clientSecret: 'my-secret' },
            b2bModulesAvailable: true
        }));

        // Verify set active
        expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
            activeProfile: 'MySaaS'
        }));
    });

    it('should add a SaaS profile with pre-generated token', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });
        const mockClient = { get: jest.fn().mockResolvedValue({}) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MySaaSToken',
            '--type', 'ac-saas',
            '--url', 'https://saas.test',
            '--token', 'my-access-token'
        ]);

        expect(configMod.addProfile).toHaveBeenCalledWith('MySaaSToken', expect.objectContaining({
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: { token: 'my-access-token' },
            b2bModulesAvailable: true
        }));
    });

    it('should add a Bearer Token profile non-interactively', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });
        const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Catalog']) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MyBearer',
            '--type', 'magento-os',
            '--url', 'https://magento.test',
            '--auth-method', 'bearer',
            '--token', 'my-token'
        ]);

        expect(configMod.addProfile).toHaveBeenCalledWith('MyBearer', expect.objectContaining({
            type: 'magento-os',
            url: 'https://magento.test',
            auth: { method: 'bearer', token: 'my-token' }
        }));
    });

    it('should infer Bearer method if only token is provided', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });
        const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Catalog']) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MyInferredBearer',
            '--type', 'magento-os',
            '--url', 'https://magento.test',
            '--token', 'my-token'
        ]);

        expect(configMod.addProfile).toHaveBeenCalledWith('MyInferredBearer', expect.objectContaining({
            auth: { method: 'bearer', token: 'my-token' }
        }));
    });

    it('should add an OAuth1 profile non-interactively', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });
        const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Catalog']) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MyOAuth',
            '--type', 'ac-on-prem',
            '--url', 'https://ac.test',
            '--auth-method', 'oauth1',
            '--consumer-key', 'ck',
            '--consumer-secret', 'cs',
            '--access-token', 'at',
            '--token-secret', 'ts'
        ]);

        expect(configMod.addProfile).toHaveBeenCalledWith('MyOAuth', expect.objectContaining({
            auth: {
                method: 'oauth1',
                consumerKey: 'ck',
                consumerSecret: 'cs',
                accessToken: 'at',
                tokenSecret: 'ts',
                signatureMethod: 'hmac-sha256'
            }
        }));
    });

    it('should add an OAuth1 profile with SHA1 signature', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });
        const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Catalog']) };
        factoryMod.createClient.mockResolvedValue(mockClient);

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'MyOAuthSHA1',
            '--type', 'ac-on-prem',
            '--url', 'https://ac.test',
            '--auth-method', 'oauth1',
            '--consumer-key', 'ck',
            '--consumer-secret', 'cs',
            '--access-token', 'at',
            '--token-secret', 'ts',
            '--signature-method', 'hmac-sha1'
        ]);

        expect(configMod.addProfile).toHaveBeenCalledWith('MyOAuthSHA1', expect.objectContaining({
            auth: {
                method: 'oauth1',
                consumerKey: 'ck',
                consumerSecret: 'cs',
                accessToken: 'at',
                tokenSecret: 'ts',
                signatureMethod: 'hmac-sha1'
            }
        }));
    });

    it('should skip test if --no-test is provided', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'NoTestProfile',
            '--type', 'ac-saas',
            '--url', 'https://saas.test',
            '--client-id', 'id',
            '--client-secret', 'secret',
            '--no-test'
        ]);

        expect(factoryMod.createClient).not.toHaveBeenCalled();
        expect(configMod.addProfile).toHaveBeenCalled();
    });

    it('should fail if required SaaS params are missing', async () => {
        // We catch the error manually because commander exitOverride might not be enough depending on implementation
        // But here we rely on the implementation throwing an error or console.error + process.exit
        // Since we are mocking everything, let's assume our implementation will throw an Error for validation

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'BadSaaS',
            '--type', 'ac-saas',
            '--url', 'https://saas.test'
            // Missing client-id/secret
        ]);

        expect(utilsMod.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('SaaS authentication requires --client-id and --client-secret') }));
    });

    it('should fail if required Bearer params are missing', async () => {
        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'BadBearer',
            '--type', 'magento-os',
            '--url', 'https://magento.test',
            '--auth-method', 'bearer'
            // Missing token
        ]);
        expect(utilsMod.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Bearer authentication requires --token') }));
    });

    it('should fail if connection test fails', async () => {
        configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: 'Other' });
        factoryMod.createClient.mockResolvedValue({
            get: jest.fn().mockRejectedValue(new Error('Connection Refused'))
        });

        await program.parseAsync([
            'node', 'test', 'connection', 'add',
            '--name', 'FailTest',
            '--type', 'magento-os',
            '--url', 'https://magento.test',
            '--token', 'token'
        ]);
        expect(utilsMod.handleError).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Connection test failed: Connection Refused') }));
    });
});
