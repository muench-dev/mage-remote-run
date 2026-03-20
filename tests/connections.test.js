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

// Dynamic imports are needed after unstable_mockModule
const configMod = await import('../lib/config.js');
const factoryMod = await import('../lib/api/factory.js');
const promptsMod = await import('../lib/prompts.js');
const inquirerPrompts = await import('@inquirer/prompts');
const { select } = inquirerPrompts;
const inquirer = await import('inquirer');
const { registerConnectionCommands } = await import('../lib/commands/connections.js');
const Table = (await import('cli-table3')).default;

describe('Connection Commands', () => {
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

    describe('connection add', () => {
        it('should add a new profile and set as active', async () => {
            // Setup Mocks
            inquirerPrompts.input.mockResolvedValue('MyProfile');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'saas', url: 'http://test.com' });
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'Existing': {}, 'MyProfile': {} }, // Simulate multiple profiles to trigger "set active" prompt
                activeProfile: 'Existing'
            });

            // Mock confirm for the sequence:
            // 1. "Test connection?" -> false (Skip test to exit loop)
            // 2. "Set this as the active profile?" -> true
            inquirerPrompts.confirm
                .mockResolvedValueOnce(false) // Skip test loop
                .mockResolvedValueOnce(true); // Set as active

            // Execute
            await program.parseAsync(['node', 'test', 'connection', 'add']);

            // Verify
            expect(inquirerPrompts.input).toHaveBeenCalled();
            expect(promptsMod.askForProfileSettings).toHaveBeenCalled();
            expect(inquirerPrompts.confirm).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test connection?' }));
            expect(configMod.addProfile).toHaveBeenCalledWith('MyProfile', { type: 'saas', url: 'http://test.com' });
            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ activeProfile: 'MyProfile' }));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('saved successfully'));
        });

        it('should detect B2B modules for Adobe Commerce PaaS/On-Prem', async () => {
            inquirerPrompts.input.mockResolvedValue('Commerce');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'ac-on-prem', url: 'http://ac.test' });
            configMod.loadConfig.mockResolvedValue({
                profiles: {},
                activeProfile: null
            });

            inquirerPrompts.confirm.mockResolvedValueOnce(false);

            const mockClient = { get: jest.fn().mockResolvedValue([
                'Magento_Company',
                'Magento_CompanyCredit',
                'Magento_CompanyPayment',
                'Magento_CompanyShipping',
                'Magento_NegotiableQuote',
                'Magento_PurchaseOrder',
                'Magento_RequisitionList',
                'Magento_SharedCatalog'
            ]) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(factoryMod.createClient).toHaveBeenCalledWith(expect.objectContaining({ type: 'ac-on-prem' }));
            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(configMod.addProfile).toHaveBeenCalledWith('Commerce', expect.objectContaining({
                type: 'ac-on-prem',
                b2bModulesAvailable: true
            }));
        });

        it('should mark B2B modules available for Adobe Commerce SaaS', async () => {
            inquirerPrompts.input.mockResolvedValue('Commerce');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'ac-saas', url: 'http://saas.test' });
            configMod.loadConfig.mockResolvedValue({
                profiles: {},
                activeProfile: null
            });

            inquirerPrompts.confirm.mockResolvedValueOnce(false);

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(factoryMod.createClient).not.toHaveBeenCalled();
            expect(configMod.addProfile).toHaveBeenCalledWith('Commerce', expect.objectContaining({
                type: 'ac-saas',
                b2bModulesAvailable: true
            }));
        });

        it('should set b2bModulesAvailable false when module lookup fails', async () => {
            inquirerPrompts.input.mockResolvedValue('Commerce');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'ac-cloud-paas', url: 'http://paas.test' });
            configMod.loadConfig.mockResolvedValue({
                profiles: {},
                activeProfile: null
            });

            inquirerPrompts.confirm.mockResolvedValueOnce(false);

            const mockClient = { get: jest.fn().mockRejectedValue(new Error('No access')) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(configMod.addProfile).toHaveBeenCalledWith('Commerce', expect.objectContaining({
                type: 'ac-cloud-paas',
                b2bModulesAvailable: null
            }));
        });

        it('should detect Hyva Commerce module', async () => {
            inquirerPrompts.input.mockResolvedValue('HyvaStore');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'magento-os', url: 'http://hyva.test' });
            configMod.loadConfig.mockResolvedValue({
                profiles: {},
                activeProfile: null
            });

            inquirerPrompts.confirm.mockResolvedValueOnce(false);

            const mockClient = { get: jest.fn().mockResolvedValue([
                'Magento_Store',
                'Hyva_Commerce'
            ]) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(configMod.addProfile).toHaveBeenCalledWith('HyvaStore', expect.objectContaining({
                type: 'magento-os',
                hyvaCommerceAvailable: true,
                hyvaThemeAvailable: false
            }));
        });
    });

    describe('connection list', () => {
        it('should list profiles', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'TestProfile': { type: 'paas', url: 'http://paas.com' }
                },
                activeProfile: 'TestProfile'
            });

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should list profiles in JSON format', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'TestProfile': { type: 'paas', url: 'http://paas.com' }
                },
                activeProfile: 'TestProfile'
            });

            await program.parseAsync(['node', 'test', 'connection', 'list', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({
                'TestProfile': { type: 'paas', url: 'http://paas.com' }
            }, null, 2));
        });

        it('should list profiles in CSV format', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'TestProfile': { type: 'paas', url: 'http://paas.com' }
                },
                activeProfile: 'TestProfile'
            });

            await program.parseAsync(['node', 'test', 'connection', 'list', '--format', 'csv']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_CSV');
        });

        it('should include B2B status for Adobe Commerce profiles', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'SaaS': { type: 'ac-saas', url: 'http://saas.test' },
                    'PaaS': { type: 'ac-cloud-paas', url: 'http://paas.test', b2bModulesAvailable: false }
                },
                activeProfile: 'SaaS'
            });

            const mockClient = { get: jest.fn().mockResolvedValue([]) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });

        it('should detect B2B status when missing and persist it', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'OnPrem': { type: 'ac-on-prem', url: 'http://ac.test' }
                },
                activeProfile: 'OnPrem'
            });

            const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Company']) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
                profiles: expect.objectContaining({
                    OnPrem: expect.objectContaining({
                        b2bModulesAvailable: false
                    })
                })
            }));
        });
    });

    describe('connection test', () => {
        it('should test active connection successfully', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'TestProfile',
                profiles: { 'TestProfile': {} }
            });

            const mockClient = { get: jest.fn().mockResolvedValue({}) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'test']);

            expect(factoryMod.createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeViews');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Connection successful'));
        });

        it('should fail gracefully if connection fails', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'TestProfile',
                profiles: { 'TestProfile': {} }
            });
            factoryMod.createClient.mockRejectedValue(new Error('Network Error'));

            await program.parseAsync(['node', 'test', 'connection', 'test']);

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Connection failed'), 'Network Error');
        });

        it('should test ALL connections with --all flag', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'P1': { type: 'saas' },
                    'P2': { type: 'paas' }
                },
                activeProfile: 'P1'
            });

            const mockClient = { get: jest.fn().mockResolvedValue({}) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'test', '--all']);

            expect(factoryMod.createClient).toHaveBeenCalledTimes(2);
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE'); // Expect table output for all
        });
    });

    describe('connection delete', () => {
        it('should delete a profile if confirmed', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'DelProfile': {} },
                activeProfile: null
            });
            inquirer.default.prompt.mockResolvedValue({ confirm: true });

            await program.parseAsync(['node', 'test', 'connection', 'delete', 'DelProfile']);

            expect(configMod.saveConfig).toHaveBeenCalled();
        });
    });

    describe('connection status', () => {
        it('should show active status', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'MyProfile',
                profiles: { 'MyProfile': { type: 'saas', url: 'http://test.com' } }
            });

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            const tableInstance = Table.mock.results[0].value;
            expect(tableInstance.push).toHaveBeenCalled();
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['Active Profile', expect.stringContaining('MyProfile')]);
        });

        it('should show B2B module status for Adobe Commerce PaaS/On-Prem', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'Commerce',
                profiles: { 'Commerce': { type: 'ac-on-prem', url: 'http://ac.test', b2bModulesAvailable: true } }
            });

            const mockClient = { get: jest.fn().mockResolvedValue([
                'Magento_Company',
                'Magento_CompanyCredit',
                'Magento_CompanyPayment',
                'Magento_CompanyShipping',
                'Magento_NegotiableQuote',
                'Magento_PurchaseOrder',
                'Magento_RequisitionList',
                'Magento_SharedCatalog'
            ]) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/modules');
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            const tableInstance = Table.mock.results[0].value;
            expect(tableInstance.push).toHaveBeenCalled();
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['B2B Modules', expect.stringContaining('Yes')]);
        });

        it('should show B2B modules as available for Adobe Commerce SaaS', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'Commerce',
                profiles: { 'Commerce': { type: 'ac-saas', url: 'http://saas.test' } }
            });

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            const tableInstance = Table.mock.results[0].value;
            expect(tableInstance.push).toHaveBeenCalled();
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['B2B Modules', expect.stringContaining('Yes')]);
        });

        it('should show Hyva status for Magento OS', async () => {
             configMod.loadConfig.mockResolvedValue({
                activeProfile: 'HyvaStore',
                profiles: { 'HyvaStore': { type: 'magento-os', url: 'http://hyva.test', hyvaCommerceAvailable: true, hyvaThemeAvailable: true } }
            });

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            const tableInstance = Table.mock.results[0].value;
            expect(tableInstance.push).toHaveBeenCalled();
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['Hyvä Commerce', expect.stringContaining('Yes')]);
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['Hyvä Theme', expect.stringContaining('Yes')]);
        });

        it('should output JSON when requested', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'MyProfile',
                profiles: { 'MyProfile': { type: 'saas', url: 'http://test.com' } }
            });

            await program.parseAsync(['node', 'test', 'connection', 'status', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({
                activeProfile: 'MyProfile',
                type: 'saas',
                url: 'http://test.com'
            }, null, 2));
        });
    });

    describe('connection select', () => {
        it('should select active profile', async () => {
            configMod.loadConfig.mockResolvedValue({
                activeProfile: 'Old',
                profiles: { 'Old': {}, 'New': {} }
            });

            // Use namespace import to access the mock
            const inquirerPrompts = await import('@inquirer/prompts');
            inquirerPrompts.select.mockResolvedValue('New');

            await program.parseAsync(['node', 'test', 'connection', 'select']);

            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ activeProfile: 'New' }));
            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
            const tableInstance = Table.mock.results[0].value;
            expect(tableInstance.push).toHaveBeenCalled();
            expect(tableInstance.push.mock.calls[0]).toContainEqual(['Active Profile', expect.stringContaining('New')]);
        });

        it('should show message when no profiles exist', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'select']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No profiles found'));
        });
    });

    describe('connection clear-token-cache', () => {
        it('should clear token cache', async () => {
            configMod.clearTokenCache.mockResolvedValue(undefined);

            await program.parseAsync(['node', 'test', 'connection', 'clear-token-cache']);

            expect(configMod.clearTokenCache).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Token cache cleared'));
        });

        it('should handle errors', async () => {
            configMod.clearTokenCache.mockRejectedValue(new Error('Clear failed'));

            await program.parseAsync(['node', 'test', 'connection', 'clear-token-cache']);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });
    });

    describe('connection status-header', () => {
        it('should enable the status header', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'status-header', 'on']);

            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ showActiveConnectionHeader: true }));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('enabled'));
        });

        it('should disable the status header', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'status-header', 'off']);

            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({ showActiveConnectionHeader: false }));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('disabled'));
        });

        it('should reject invalid state', async () => {
            await program.parseAsync(['node', 'test', 'connection', 'status-header', 'maybe']);

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid state'));
            expect(configMod.saveConfig).not.toHaveBeenCalled();
        });
    });

    describe('connection status - edge cases', () => {
        it('should output JSON when no active profile is set', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'status', '--format', 'json']);

            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify({ error: 'No active profile configured' }));
        });

        it('should show message when no active profile in text format', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active profile configured'));
        });

        it('should show error when active profile is missing from config', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {},
                activeProfile: 'Ghost'
            });

            await program.parseAsync(['node', 'test', 'connection', 'status']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Profile not found'));
        });
    });

    describe('connection test - edge cases', () => {
        it('should show message when no profiles exist for --all', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'test', '--all']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No profiles found'));
        });

        it('should handle no active profile without --all flag', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'test']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active profile configured'));
        });

        it('should handle outer catch errors', async () => {
            configMod.loadConfig.mockRejectedValue(new Error('Config load failed'));

            await program.parseAsync(['node', 'test', 'connection', 'test']);

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test failed'), 'Config load failed');
        });

        it('should handle failed connection in --all mode', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'P1': { type: 'saas' } },
                activeProfile: 'P1'
            });
            factoryMod.createClient.mockRejectedValue(new Error('Connection refused'));

            await program.parseAsync(['node', 'test', 'connection', 'test', '--all']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');
        });
    });

    describe('connection edit', () => {
        it('should edit a named profile', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'MyProfile': { type: 'saas', url: 'http://test.com' } },
                activeProfile: 'MyProfile'
            });
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'saas', url: 'http://updated.com' });
            inquirerPrompts.confirm.mockResolvedValueOnce(false); // skip test
            configMod.saveConfig.mockResolvedValue(undefined);

            await program.parseAsync(['node', 'test', 'connection', 'edit', 'MyProfile']);

            expect(configMod.saveConfig).toHaveBeenCalledWith(expect.objectContaining({
                profiles: expect.objectContaining({
                    'MyProfile': expect.objectContaining({ url: 'http://updated.com' })
                })
            }));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
        });

        it('should prompt for profile when no name given', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'P1': { type: 'saas', url: 'http://test.com' } },
                activeProfile: 'P1'
            });
            select.mockResolvedValue('P1');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'saas', url: 'http://updated.com' });
            inquirerPrompts.confirm.mockResolvedValueOnce(false);
            configMod.saveConfig.mockResolvedValue(undefined);

            await program.parseAsync(['node', 'test', 'connection', 'edit']);

            expect(select).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('updated'));
        });

        it('should cancel edit when no profiles exist', async () => {
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            await program.parseAsync(['node', 'test', 'connection', 'edit']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No profiles found'));
        });

        it('should handle cancelled edit via settings=null', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: { 'P1': { type: 'saas', url: 'http://test.com' } },
                activeProfile: 'P1'
            });
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'saas', url: 'http://test.com' });
            // connection fails, user doesn't want to edit, doesn't want to save
            inquirerPrompts.confirm
                .mockResolvedValueOnce(true)  // test connection
                .mockResolvedValueOnce(false) // don't edit settings
                .mockResolvedValueOnce(false); // don't save anyway
            factoryMod.createClient.mockRejectedValue(new Error('Failed'));

            await program.parseAsync(['node', 'test', 'connection', 'edit', 'P1']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Edit cancelled'));
        });
    });

    describe('connection add - interactive test flow', () => {
        it('should handle successful connection test and save profile', async () => {
            inquirerPrompts.input.mockResolvedValue('NewProfile');
            promptsMod.askForProfileSettings.mockResolvedValue({ type: 'saas', url: 'http://test.com' });
            configMod.loadConfig.mockResolvedValue({ profiles: {}, activeProfile: null });

            const mockClient = { get: jest.fn().mockResolvedValue({}) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            inquirerPrompts.confirm
                .mockResolvedValueOnce(true);  // test connection -> succeeds, loop ends

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/store/storeViews');
            expect(configMod.addProfile).toHaveBeenCalledWith('NewProfile', expect.anything());
        });

        it('should handle ExitPromptError by cancelling', async () => {
            const exitError = new Error('User aborted');
            exitError.name = 'ExitPromptError';
            inquirerPrompts.input.mockRejectedValue(exitError);

            await program.parseAsync(['node', 'test', 'connection', 'add']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('cancelled'));
        });
    });

    describe('connection list - error handling', () => {
        it('should handle list errors', async () => {
            configMod.loadConfig.mockRejectedValue(new Error('Load failed'));

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should handle terminal width when connections are wide', async () => {
            // Set a narrow terminal width to trigger truncation
            const originalColumns = process.stdout.columns;
            Object.defineProperty(process.stdout, 'columns', { value: 60, configurable: true });

            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'very-long-profile-name-here': {
                        type: 'ac-cloud-paas',
                        url: 'https://very-long-url-that-would-be-truncated.example.com',
                        b2bModulesAvailable: true,
                        hyvaCommerceAvailable: false,
                        hyvaThemeAvailable: false
                    }
                },
                activeProfile: 'very-long-profile-name-here'
            });

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            expect(consoleLogSpy).toHaveBeenCalledWith('MOCK_TABLE');

            Object.defineProperty(process.stdout, 'columns', { value: originalColumns, configurable: true });
        });
    });

    describe('connection list - legacy field migration', () => {
        it('should migrate hyvaModulesAvailable field and persist updated config', async () => {
            configMod.loadConfig.mockResolvedValue({
                profiles: {
                    'Hyva': { type: 'magento-os', url: 'http://hyva.test', hyvaModulesAvailable: true }
                },
                activeProfile: 'Hyva'
            });

            const mockClient = { get: jest.fn().mockResolvedValue(['Magento_Store', 'Hyva_Commerce']) };
            factoryMod.createClient.mockResolvedValue(mockClient);

            await program.parseAsync(['node', 'test', 'connection', 'list']);

            // saveConfig should be called since profile was updated (migration + module detection)
            expect(configMod.saveConfig).toHaveBeenCalled();
            // hyvaCommerceAvailable should be set (migrated from hyvaModulesAvailable and then re-evaluated)
            const savedConfig = configMod.saveConfig.mock.calls[0][0];
            expect(savedConfig.profiles.Hyva).not.toHaveProperty('hyvaModulesAvailable');
        });
    });
});
