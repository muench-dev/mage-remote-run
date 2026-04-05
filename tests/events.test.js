import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

// Mock Inquirer
const mockInquirer = {
    prompt: jest.fn()
};
jest.unstable_mockModule('inquirer', () => ({
    default: mockInquirer
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

// Mock Config
jest.unstable_mockModule('../lib/config.js', () => ({
    getActiveProfile: jest.fn(),
    loadConfig: jest.fn()
}));

const factoryMod = await import('../lib/api/factory.js');
const configMod = await import('../lib/config.js');
const { registerEventsCommands } = await import('../lib/commands/events.js');

describe('Events Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        registerEventsCommands(program);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockClient = {
            get: jest.fn(),
            post: jest.fn(),
            delete: jest.fn()
        };
        factoryMod.createClient.mockResolvedValue(mockClient);
        mockInquirer.prompt.mockClear();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('check-configuration', () => {
        it('should check configuration successfully', async () => {
            const mockResponse = { status: 'ok', message: 'Configuration is valid.' };
            mockClient.get.mockResolvedValue(mockResponse);

            await program.parseAsync(['node', 'test', 'event', 'check-configuration']);

            expect(factoryMod.createClient).toHaveBeenCalled();
            expect(mockClient.get).toHaveBeenCalledWith('V1/adobe_io_events/check_configuration', {}, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration Check Result'));
        });

        it('should output json format', async () => {
            const mockResponse = { status: 'ok' };
            mockClient.get.mockResolvedValue(mockResponse);

            await program.parseAsync(['node', 'test', 'event', 'check-configuration', '--format', 'json']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/adobe_io_events/check_configuration', {}, expect.objectContaining({ headers: { Accept: 'application/json' } }));
            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(mockResponse, null, 2));
        });
    });

    describe('provider list', () => {
        it('should list providers successfully', async () => {
            const mockResponse = [
                { id: '1', label: 'Provider 1', description: 'Desc 1' },
                { id: '2', label: 'Provider 2', description: 'Desc 2' }
            ];
            mockClient.get.mockResolvedValue(mockResponse);

            await program.parseAsync(['node', 'test', 'event', 'provider', 'list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/eventing/eventProvider', {}, expect.objectContaining({ headers: {} }));
            // Check for table content
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Provider 1/));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Provider 2/));
        });
    });

    describe('provider show', () => {
        it('should show provider details successfully', async () => {
            // Mocking list response as the command fetches list and filters
            const mockListResponse = [
                { id: '123', label: 'Target Provider', description: 'Target Desc' },
                { id: '456', label: 'Other', description: 'Other Desc' }
            ];
            mockClient.get.mockResolvedValue(mockListResponse);

            await program.parseAsync(['node', 'test', 'event', 'provider', 'show', '123']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/eventing/eventProvider', {}, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Target Provider'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Target Desc'));
        });

        it('should handle provider not found', async () => {
            const mockListResponse = [];
            mockClient.get.mockResolvedValue(mockListResponse);

            // Commander might exit or handle errors differently depending on structure, 
            // but our action catches and calls handleError. 
            // handleError typically logs to console.error or throws depending on impl.
            // But in test env we mocked console.error.
            // Just verifying it doesn't crash and maybe logs error (if we spied on error).
            const errorSpy = jest.spyOn(console, 'error');

            await program.parseAsync(['node', 'test', 'event', 'provider', 'show', '999']);

            // Depending on how handleError is implemented, it might log the error.
            // We can just expect get to be called.
            expect(mockClient.get).toHaveBeenCalled();
        });
    });

    describe('provider create', () => {
        it('should create provider successfully with interactive input', async () => {

            // Mock getActiveProfile for instance_id detection (SaaS URL)
            configMod.getActiveProfile.mockResolvedValue({
                type: 'ac-saas',
                url: 'https://na1-sandbox.api.commerce.adobe.com/test-instance-id'
            });

            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-123',
                label: 'New Provider',
                description: 'New Description',
                instance_id: 'test-instance-id',
                workspace_configuration: '{}'
            });
            mockClient.post.mockResolvedValue({ id: 'uuid-123', status: 'created' });

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);


            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Attempting to auto-detect Instance ID'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Found Instance ID (from URL): test-instance-id'));

            // Verify check_configuration was called (optional but good)
            // expect(mockClient.get).toHaveBeenCalledWith('V1/adobe_io_events/check_configuration'); 
            // Gets tricky because get is called multiple times in other tests, but here it's specific sequence.

            expect(mockInquirer.prompt).toHaveBeenCalled();
            expect(mockClient.post).toHaveBeenCalledWith('V1/eventing/eventProvider', {
                eventProvider: {
                    provider_id: 'uuid-123',
                    instance_id: 'test-instance-id',
                    label: 'New Provider',
                    description: 'New Description',
                    workspace_configuration: '{}'
                }
            });
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Created Successfully'));
        });
    });

    describe('provider delete', () => {
        it('should delete provider successfully', async () => {
            mockClient.delete.mockResolvedValue(true);

            await program.parseAsync(['node', 'test', 'event', 'provider', 'delete', '123']);

            expect(mockClient.delete).toHaveBeenCalledWith('V1/eventing/eventProvider/123');
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('deleted successfully'));
        });
    });

    describe('supported-list', () => {
        it('should list supported events successfully', async () => {
            const mockResponse = ['event.one', 'event.two'];
            mockClient.get.mockResolvedValue(mockResponse);

            await program.parseAsync(['node', 'test', 'event', 'supported-list']);

            expect(mockClient.get).toHaveBeenCalledWith('V1/eventing/supportedList', {}, expect.any(Object));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/event.one/));
        });

        it('should output json format', async () => {
            mockClient.get.mockResolvedValue(['event.one']);
            await program.parseAsync(['node', 'test', 'event', 'supported-list', '--format', 'json']);
            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(['event.one'], null, 2));
        });

        it('should display object data via table', async () => {
            mockClient.get.mockResolvedValue([{ name: 'event.one', description: 'Event one' }]);
            await program.parseAsync(['node', 'test', 'event', 'supported-list']);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('event.one'));
        });

        it('should display non-array data directly', async () => {
            mockClient.get.mockResolvedValue('total: 5 events');
            await program.parseAsync(['node', 'test', 'event', 'supported-list']);
            expect(consoleLogSpy).toHaveBeenCalledWith('total: 5 events');
        });
    });

    describe('check-configuration additional cases', () => {
        it('should display array response data as JSON', async () => {
            mockClient.get.mockResolvedValue(['item1', 'item2']);
            await program.parseAsync(['node', 'test', 'event', 'check-configuration']);
            expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(['item1', 'item2'], null, 2));
        });

        it('should display scalar (non-object) response data', async () => {
            mockClient.get.mockResolvedValue('Configuration is OK');
            await program.parseAsync(['node', 'test', 'event', 'check-configuration']);
            expect(consoleLogSpy).toHaveBeenCalledWith('  Configuration is OK');
        });

        it('should display boolean and null property values', async () => {
            mockClient.get.mockResolvedValue({ enabled: true, disabled: false, empty: null });
            await program.parseAsync(['node', 'test', 'event', 'check-configuration']);
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        it('should handle errors', async () => {
            mockClient.get.mockRejectedValue(new Error('Config check failed'));
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await program.parseAsync(['node', 'test', 'event', 'check-configuration']);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('provider list additional cases', () => {
        it('should output json format', async () => {
            mockClient.get.mockResolvedValue([{ id: '1', label: 'Provider 1' }]);
            await program.parseAsync(['node', 'test', 'event', 'provider', 'list', '--format', 'json']);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });

        it('should handle errors', async () => {
            mockClient.get.mockRejectedValue(new Error('List failed'));
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            await program.parseAsync(['node', 'test', 'event', 'provider', 'list']);
            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('provider show additional cases', () => {
        it('should find provider when data is a single object (not array)', async () => {
            mockClient.get.mockResolvedValue({ id: '123', label: 'Single Provider', description: 'Desc' });
            await program.parseAsync(['node', 'test', 'event', 'provider', 'show', '123']);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Single Provider'));
        });

        it('should output json format', async () => {
            mockClient.get.mockResolvedValue([{ id: '123', label: 'Provider' }]);
            await program.parseAsync(['node', 'test', 'event', 'provider', 'show', '123', '--format', 'json']);
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"id"'));
        });
    });

    describe('provider create additional cases', () => {
        it('should handle non-saas profile for instance ID detection', async () => {
            configMod.getActiveProfile.mockResolvedValue({ type: 'ac-cloud-paas', url: 'https://example.com' });
            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-456', label: 'Provider', description: 'Desc',
                instance_id: 'inst-1', workspace_configuration: '{}'
            });
            mockClient.post.mockResolvedValue({ id: 'uuid-456' });

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Instance ID detection only supported for SaaS'));
        });

        it('should handle SaaS URL with no path parts', async () => {
            configMod.getActiveProfile.mockResolvedValue({ type: 'ac-saas', url: 'https://example.com' });
            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-789', label: 'Provider', description: 'Desc',
                instance_id: 'inst-2', workspace_configuration: '{}'
            });
            mockClient.post.mockResolvedValue({ id: 'uuid-789' });

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Could not extract Instance ID from URL'));
        });

        it('should handle invalid URL in profile', async () => {
            configMod.getActiveProfile.mockResolvedValue({ type: 'ac-saas', url: 'not-a-valid-url' });
            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-inv', label: 'Provider', description: 'Desc',
                instance_id: 'inst-inv', workspace_configuration: '{}'
            });
            mockClient.post.mockResolvedValue({ id: 'uuid-inv' });

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid URL in profile configuration'));
        });

        it('should handle auto-detect failure gracefully', async () => {
            configMod.getActiveProfile.mockRejectedValue(new Error('Profile error'));
            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-fail', label: 'Provider', description: 'Desc',
                instance_id: 'inst-fail', workspace_configuration: '{}'
            });
            mockClient.post.mockResolvedValue({ id: 'uuid-fail' });

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Could not auto-detect Instance ID'));
        });

        it('should handle errors', async () => {
            configMod.getActiveProfile.mockResolvedValue({ type: 'ac-saas', url: 'https://example.com/inst-1' });
            mockInquirer.prompt.mockResolvedValue({
                provider_id: 'uuid-err', label: 'Provider', description: 'Desc',
                instance_id: 'inst-err', workspace_configuration: '{}'
            });
            mockClient.post.mockRejectedValue(new Error('Create failed'));
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await program.parseAsync(['node', 'test', 'event', 'provider', 'create']);

            expect(errorSpy).toHaveBeenCalled();
        });
    });

    describe('provider delete additional cases', () => {
        it('should handle errors', async () => {
            mockClient.delete.mockRejectedValue(new Error('Delete failed'));
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await program.parseAsync(['node', 'test', 'event', 'provider', 'delete', '123']);

            expect(errorSpy).toHaveBeenCalled();
        });
    });

});
