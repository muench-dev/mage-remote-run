import { jest } from '@jest/globals';

jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/utils.js', () => ({
    handleError: jest.fn(),
    formatOutput: jest.fn(),
    addFormatOption: jest.fn((cmd) => cmd),
    addFilterOption: jest.fn((cmd) => cmd),
    addSortOption: jest.fn((cmd) => cmd),
    addPaginationOptions: jest.fn((cmd) => cmd),
    buildSearchCriteria: jest.fn().mockReturnValue({}),
    buildSortCriteria: jest.fn().mockReturnValue({})
}));

jest.unstable_mockModule('chalk', () => ({
    default: {
        yellow: jest.fn(str => str),
        red: jest.fn(str => str),
        cyan: jest.fn(str => str)
    }
}));

const { registerVirtualCommands } = await import('../lib/commands/virtual.js');
const { createClient } = await import('../lib/api/factory.js');
const { formatOutput, buildSearchCriteria } = await import('../lib/utils.js');

describe('Virtual Commands', () => {
    let program;
    let config;
    let profile;

    let mockCommand;
    let mockAction;

    beforeEach(() => {
        mockAction = jest.fn();

        const createMockCommand = (cmdName) => {
            const cmd = {
                commands: [],
                _name: cmdName,
                name: jest.fn().mockImplementation(() => cmd._name),
                description: jest.fn().mockReturnThis(),
                summary: jest.fn().mockReturnThis(),
                requiredOption: jest.fn().mockReturnThis(),
                option: jest.fn().mockReturnThis(),
                action: jest.fn().mockImplementation((fn) => {
                    mockAction = fn;
                    return cmd;
                }),
                command: jest.fn((subName) => {
                    const newCmd = createMockCommand(subName.split(' ')[0]);
                    cmd.commands.push(newCmd);
                    return newCmd;
                })
            };
            return cmd;
        };

        mockCommand = createMockCommand('mock');

        // Ensure fake commands created from `program.command()` return mockCommand
        // We simulate commander returning a new command instance or attaching to an existing one.
        program = {
            commands: [],
            command: jest.fn((name) => {
                const parts = name.split(' ');
                const newCmd = createMockCommand(parts[0]);
                mockCommand = newCmd; // Track the most recently created root command for assertions
                program.commands.push(newCmd);
                return newCmd;
            })
        };

        profile = { type: 'magento-os' };
        
        config = {
            commands: [
                {
                    name: 'test get',
                    method: 'GET',
                    endpoint: '/V1/test/:id',
                    description: 'Test virtual command',
                    summary: 'Test summary',
                    parameter: {
                        id: { type: 'string', required: true, description: 'Test ID' },
                        optional: { type: 'string', required: false, default: 'yes' }
                    },
                    connection_types: ['magento-os']
                }
            ]
        };
        
        jest.clearAllMocks();
    });

    it('should register a valid virtual command based on config', () => {
        registerVirtualCommands(program, config, profile);

        expect(program.command).toHaveBeenCalledWith('test');
        
        const testCmd = program.commands[0];
        const getCmd = testCmd.commands[0];

        expect(getCmd._name).toBe('get');
        expect(getCmd.description).toHaveBeenCalledWith('Test virtual command');
        expect(getCmd.summary).toHaveBeenCalledWith('Test summary');
        expect(getCmd.requiredOption).toHaveBeenCalledWith('--id <value>', 'Test ID');
        expect(getCmd.option).toHaveBeenCalledWith('--optional <value>', 'Parameter optional', 'yes');
        expect(getCmd.action).toHaveBeenCalled();
    });

    it('should support config-defined options in addition to legacy parameters', () => {
        config.commands[0] = {
            name: 'example virtual get',
            method: 'GET',
            endpoint: '/V1/example/:countryId',
            description: 'Example virtual command',
            options: {
                countryId: { type: 'string', required: true, description: 'Country ID' },
                verbose: { type: 'boolean', description: 'Verbose output' },
                store: { type: 'string', long: 'store-code', short: 'S', default: 'all' }
            },
            connection_types: ['magento-os']
        };

        registerVirtualCommands(program, config, profile);

        const exampleCmd = program.commands[0];
        const virtualCmd = exampleCmd.commands[0];
        const getCmd = virtualCmd.commands[0];

        expect(getCmd.requiredOption).toHaveBeenCalledWith('--countryId <value>', 'Country ID');
        expect(getCmd.option).toHaveBeenCalledWith('--verbose', 'Verbose output');
        expect(getCmd.option).toHaveBeenCalledWith('-S, --store-code <value>', 'Option store', 'all');
    });

    it('should not register command if profile connection type does not match', () => {
        config.commands[0].connection_types = ['ac-saas'];
        
        registerVirtualCommands(program, config, profile);

        expect(program.command).not.toHaveBeenCalled();
    });

    it('should execute action mapping parameters to URL and query string', async () => {
        const mockClient = {
            request: jest.fn().mockResolvedValue({ data: { success: true } })
        };
        createClient.mockResolvedValue(mockClient);

        registerVirtualCommands(program, config, profile);

        // Simulate Commander executing the action callback
        await mockAction({ id: '123', optional: 'no', format: 'json' });

        expect(createClient).toHaveBeenCalled();
        expect(mockClient.request).toHaveBeenCalledWith(
            'GET', 
            '/V1/test/123', 
            undefined, 
            { optional: 'no' }, 
            { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } }
        );
        
        expect(formatOutput).toHaveBeenCalledWith(
            { id: '123', optional: 'no', format: 'json' },
            { data: { success: true } }
        );
    });

    it('should process JSON payloads for POST methods', async () => {
        config.commands[0].method = 'POST';
        
        const mockClient = {
            request: jest.fn().mockResolvedValue({ data: { created: true } })
        };
        createClient.mockResolvedValue(mockClient);

        registerVirtualCommands(program, config, profile);

        // Execute action callback
        await mockAction({ id: '999', optional: 'sure' });

        expect(mockClient.request).toHaveBeenCalledWith(
            'POST', 
            '/V1/test/999', 
            { optional: 'sure' }, 
            undefined, 
            { headers: { 'Content-Type': 'application/json' } }
        );
    });

    it('should merge predefined config filters with CLI filters', async () => {
        config.commands[0].filters = ['status=pending', 'total_due>0'];

        const mockClient = {
            request: jest.fn().mockResolvedValue({ items: [] })
        };
        createClient.mockResolvedValue(mockClient);
        buildSearchCriteria.mockReturnValue({
            params: {
                'searchCriteria[filter_groups][0][filters][0][field]': 'status'
            }
        });

        registerVirtualCommands(program, config, profile);

        await mockAction({ id: '123', filter: ['customer_id=42'] });

        expect(buildSearchCriteria).toHaveBeenCalledWith(expect.objectContaining({
            id: '123',
            filter: ['status=pending', 'total_due>0', 'customer_id=42']
        }));
        expect(mockClient.request).toHaveBeenCalledWith(
            'GET',
            '/V1/test/123',
            undefined,
            { 'searchCriteria[filter_groups][0][filters][0][field]': 'status' },
            { headers: { 'Content-Type': 'application/json' } }
        );
    });

    it('should interpolate option placeholders inside predefined filters', async () => {
        config.commands[0].filters = ['name:like=${firstLetter}*'];
        config.commands[0].parameter.firstLetter = {
            type: 'string',
            required: true,
            description: 'First letter'
        };

        const mockClient = {
            request: jest.fn().mockResolvedValue({ items: [] })
        };
        createClient.mockResolvedValue(mockClient);
        buildSearchCriteria.mockReturnValue({ params: {} });

        registerVirtualCommands(program, config, profile);

        await mockAction({ id: '123', firstLetter: 'A' });

        expect(buildSearchCriteria).toHaveBeenCalledWith(expect.objectContaining({
            id: '123',
            firstLetter: 'A',
            filter: ['name:like=A*']
        }));
    });

    it('should support brace placeholder syntax inside predefined filters', async () => {
        config.commands[0].filters = ['name:like={:firstLetter}*'];
        config.commands[0].parameter.firstLetter = {
            type: 'string',
            required: true,
            description: 'First letter'
        };

        const mockClient = {
            request: jest.fn().mockResolvedValue({ items: [] })
        };
        createClient.mockResolvedValue(mockClient);
        buildSearchCriteria.mockReturnValue({ params: {} });

        registerVirtualCommands(program, config, profile);

        await mockAction({ id: '123', firstLetter: 'B' });

        expect(buildSearchCriteria).toHaveBeenCalledWith(expect.objectContaining({
            filter: ['name:like=B*']
        }));
    });
});
