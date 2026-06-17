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
    buildSortCriteria: jest.fn().mockReturnValue({}),
    isInteractiveMode: jest.fn().mockReturnValue(false)
}));

jest.unstable_mockModule('chalk', () => ({
    default: {
        yellow: jest.fn(str => str),
        red: jest.fn(str => str),
        cyan: jest.fn(str => str)
    }
}));

jest.unstable_mockModule('@inquirer/prompts', () => ({
    select:   jest.fn(),
    input:    jest.fn(),
    password: jest.fn()
}));

const { registerVirtualCommands } = await import('../lib/commands/virtual.js');
const { createClient } = await import('../lib/api/factory.js');
const { formatOutput, buildSearchCriteria, handleError, isInteractiveMode } = await import('../lib/utils.js');
const { select, input, password } = await import('@inquirer/prompts');

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
                addOption: jest.fn().mockReturnThis(),
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
        expect(getCmd.option).toHaveBeenCalledWith('--id <value>', 'Test ID');
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

        expect(getCmd.option).toHaveBeenCalledWith('--countryId <value>', 'Country ID');
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

    describe('body template support', () => {
        it('should use body template instead of flat payload for POST', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { customer: { email: '${email}' } };
            config.commands[0].parameter.email = { type: 'string', required: true, description: 'Email' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', email: 'foo@bar.com' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { customer: { email: 'foo@bar.com' } },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should preserve deeply nested body structure', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { level1: { level2: { field: '${val}' } } };
            config.commands[0].parameter.val = { type: 'string', required: true, description: 'Val' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', val: 'deep' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { level1: { level2: { field: 'deep' } } },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should preserve number type for pure single-placeholder values', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { websiteId: '${websiteId}' };
            config.commands[0].parameter.websiteId = { type: 'string', required: false, description: 'Website ID' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', websiteId: 1 });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { websiteId: 1 },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should preserve boolean type for pure single-placeholder values', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { active: '${active}' };
            config.commands[0].parameter.active = { type: 'boolean', description: 'Active' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', active: true });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { active: true },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should keep mixed-content string as string type', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { label: 'User ${name}' };
            config.commands[0].parameter.name = { type: 'string', required: true, description: 'Name' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', name: 'Alice' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { label: 'User Alice' },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should pass static literal primitives through unchanged', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { version: 2, enabled: true };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { version: 2, enabled: true },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should substitute path param in URL without duplicating it in body', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { email: '${email}' };
            config.commands[0].parameter.email = { type: 'string', required: true, description: 'Email' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '42', email: 'a@b.com' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/42',
                { email: 'a@b.com' },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should support brace syntax {:param} in body template', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { name: '{:firstName}' };
            config.commands[0].parameter.firstName = { type: 'string', required: true, description: 'First name' };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', firstName: 'Bob' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { name: 'Bob' },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should fall back to flat payload when no body is configured', async () => {
            config.commands[0].method = 'POST';

            const mockClient = { request: jest.fn().mockResolvedValue({ data: { created: true } }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '999', optional: 'sure' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/999',
                { optional: 'sure' },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });
    });

    describe('choices support', () => {
        beforeEach(() => {
            isInteractiveMode.mockReturnValue(true);
            select.mockReset();
        });
        afterEach(() => {
            isInteractiveMode.mockReturnValue(false);
        });

        it('should use the provided value without prompting when choices are defined', async () => {
            config.commands[0].parameter.status = {
                type: 'string',
                required: true,
                description: 'Product status',
                choices: ['enabled', 'disabled']
            };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', status: 'enabled' });

            expect(select).not.toHaveBeenCalled();
            expect(mockClient.request).toHaveBeenCalledWith(
                'GET',
                '/V1/test/123',
                undefined,
                { status: 'enabled' },
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should prompt with select when value is not provided', async () => {
            config.commands[0].parameter.status = {
                type: 'string',
                required: true,
                description: 'Product status',
                choices: ['enabled', 'disabled']
            };

            select.mockResolvedValue('disabled');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(select).toHaveBeenCalledWith({
                message: 'Product status',
                choices: [{ name: 'enabled', value: 'enabled' }, { name: 'disabled', value: 'disabled' }],
                default: undefined
            });
            expect(mockClient.request).toHaveBeenCalledWith(
                'GET',
                '/V1/test/123',
                undefined,
                { status: 'disabled' },
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should support object choices with name and value', async () => {
            config.commands[0].parameter.visibility = {
                type: 'string',
                required: true,
                description: 'Visibility',
                choices: [
                    { name: 'Not Visible Individually', value: '1' },
                    { name: 'Catalog', value: '2' },
                    { name: 'Search', value: '3' },
                    { name: 'Catalog, Search', value: '4' }
                ]
            };

            select.mockResolvedValue('4');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(select).toHaveBeenCalledWith({
                message: 'Visibility',
                choices: [
                    { name: 'Not Visible Individually', value: '1' },
                    { name: 'Catalog', value: '2' },
                    { name: 'Search', value: '3' },
                    { name: 'Catalog, Search', value: '4' }
                ],
                default: undefined
            });
            expect(mockClient.request).toHaveBeenCalledWith(
                'GET',
                '/V1/test/123',
                undefined,
                { visibility: '4' },
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should include default in the select call when defined', async () => {
            config.commands[0].parameter.status = {
                type: 'string',
                required: false,
                description: 'Product status',
                default: 'enabled',
                choices: ['enabled', 'disabled']
            };

            select.mockResolvedValue('enabled');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' }); // no status provided — Commander default not applied in mock

            expect(select).toHaveBeenCalledWith({
                message: 'Product status',
                choices: [{ name: 'enabled', value: 'enabled' }, { name: 'disabled', value: 'disabled' }],
                default: 'enabled'
            });
        });

        it('should not call select for options without choices', async () => {
            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(select).not.toHaveBeenCalled();
        });

        it('should work with choices and body template together', async () => {
            config.commands[0].method = 'POST';
            config.commands[0].body = { status: '${status}' };
            config.commands[0].parameter.status = {
                type: 'string',
                required: true,
                description: 'Product status',
                choices: ['enabled', 'disabled']
            };

            select.mockResolvedValue('enabled');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(select).toHaveBeenCalled();
            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/V1/test/123',
                { status: 'enabled' },
                undefined,
                { headers: { 'Content-Type': 'application/json' } }
            );
        });
    });

    describe('interactive input prompts', () => {
        beforeEach(() => {
            isInteractiveMode.mockReturnValue(true);
            input.mockReset();
            password.mockReset();
        });
        afterEach(() => {
            isInteractiveMode.mockReturnValue(false);
        });

        it('should prompt with input() for a missing required string option', async () => {
            config.commands[0].parameter.name = {
                type: 'string',
                required: true,
                description: 'Customer name'
            };

            input.mockResolvedValue('Alice');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(input).toHaveBeenCalledWith({
                message: 'Customer name:',
                validate: expect.any(Function)
            });
            expect(mockClient.request).toHaveBeenCalledWith(
                'GET',
                '/V1/test/123',
                undefined,
                { name: 'Alice' },
                { headers: { 'Content-Type': 'application/json' } }
            );
        });

        it('should prompt with password() for sensitive field names', async () => {
            for (const sensitiveKey of ['password', 'secret', 'token', 'apiKey']) {
                input.mockReset();
                password.mockReset();

                const cmd = { ...config.commands[0], parameter: { ...config.commands[0].parameter } };
                cmd.parameter[sensitiveKey] = { type: 'string', required: true, description: `${sensitiveKey} value` };
                config.commands[0] = cmd;

                password.mockResolvedValue('s3cr3t');

                const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
                createClient.mockResolvedValue(mockClient);

                registerVirtualCommands(program, config, profile);
                await mockAction({ id: '123' });

                expect(password).toHaveBeenCalled();
                expect(input).not.toHaveBeenCalled();
            }
        });

        it('should use the option key as fallback message when description is absent', async () => {
            config.commands[0].parameter.email = {
                type: 'string',
                required: true
            };

            input.mockResolvedValue('test@example.com');

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(input).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Enter email:'
            }));
        });

        it('should not prompt for optional options without choices', async () => {
            config.commands[0].parameter.optional = {
                type: 'string',
                required: false,
                description: 'Optional field'
            };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(input).not.toHaveBeenCalled();
            expect(password).not.toHaveBeenCalled();
        });

        it('should not prompt for boolean type options', async () => {
            config.commands[0].parameter.flag = {
                type: 'boolean',
                required: true,
                description: 'A required flag'
            };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(input).not.toHaveBeenCalled();
            expect(password).not.toHaveBeenCalled();
        });

        it('should not prompt when value is already provided', async () => {
            config.commands[0].parameter.name = {
                type: 'string',
                required: true,
                description: 'Customer name'
            };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123', name: 'Bob' });

            expect(input).not.toHaveBeenCalled();
        });
    });

    describe('non-interactive mode', () => {
        let savedIsTTY;
        let savedCI;
        beforeEach(() => {
            savedIsTTY = process.stdin.isTTY;
            savedCI    = process.env.CI;
            process.stdin.isTTY = false;
            delete process.env.CI;
            handleError.mockReset();
            input.mockReset();
            password.mockReset();
            select.mockReset();
        });
        afterEach(() => {
            process.stdin.isTTY = savedIsTTY;
            if (savedCI !== undefined) process.env.CI = savedCI;
            else delete process.env.CI;
        });

        it('should call handleError for a missing required option without prompting', async () => {
            config.commands[0].parameter.sku = {
                type: 'string',
                required: true,
                description: 'Product SKU'
            };

            const mockClient = { request: jest.fn() };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(handleError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Missing required option: --sku'
            }));
            expect(input).not.toHaveBeenCalled();
            expect(mockClient.request).not.toHaveBeenCalled();
        });

        it('should list all missing required options in the error', async () => {
            config.commands[0].parameter.sku   = { type: 'string', required: true };
            config.commands[0].parameter.email = { type: 'string', required: true };

            const mockClient = { request: jest.fn() };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(handleError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Missing required options: --sku, --email'
            }));
        });

        it('should not error for optional options', async () => {
            config.commands[0].parameter.optional = {
                type: 'string',
                required: false,
                description: 'Optional'
            };

            const mockClient = { request: jest.fn().mockResolvedValue({ data: {} }) };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(handleError).not.toHaveBeenCalled();
        });

        it('should not prompt for choices options — error instead if required', async () => {
            config.commands[0].parameter.status = {
                type: 'string',
                required: true,
                description: 'Status',
                choices: ['enabled', 'disabled']
            };

            const mockClient = { request: jest.fn() };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(handleError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Missing required option: --status'
            }));
            expect(select).not.toHaveBeenCalled();
        });

        it('should treat CI env var as non-interactive even on a TTY', async () => {
            process.stdin.isTTY = true;
            process.env.CI = 'true';

            config.commands[0].parameter.sku = {
                type: 'string',
                required: true,
                description: 'Product SKU'
            };

            const mockClient = { request: jest.fn() };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);
            await mockAction({ id: '123' });

            expect(handleError).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Missing required option: --sku'
            }));
            expect(input).not.toHaveBeenCalled();
        });

        it('should treat NO_INTERACTIVE=1 as non-interactive even on a TTY', async () => {
            process.stdin.isTTY = true;
            process.env.NO_INTERACTIVE = '1';

            config.commands[0].parameter.sku = {
                type: 'string',
                required: true,
                description: 'Product SKU'
            };

            const mockClient = { request: jest.fn() };
            createClient.mockResolvedValue(mockClient);

            registerVirtualCommands(program, config, profile);

            try {
                await mockAction({ id: '123' });
                expect(handleError).toHaveBeenCalledWith(expect.objectContaining({
                    message: 'Missing required option: --sku'
                }));
                expect(input).not.toHaveBeenCalled();
            } finally {
                delete process.env.NO_INTERACTIVE;
            }
        });
    });
});
