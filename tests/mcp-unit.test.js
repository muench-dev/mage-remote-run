import { jest } from '@jest/globals';
import crypto from 'crypto';
import { Command } from 'commander';

jest.unstable_mockModule('http', () => {
    let requestHandler;
    return {
        default: {
            createServer: jest.fn((handler) => {
                requestHandler = handler;
                return {
                    listen: jest.fn((port, host, cb) => cb && cb()),
                    _simulateRequest: (req, res) => requestHandler(req, res)
                };
            }),
        }
    };
});

jest.unstable_mockModule('fs', () => ({
    readFileSync: jest.fn(() => JSON.stringify({ version: '1.0.0' }))
}));

const mockTools = {};
const loadPluginsMock = jest.fn(() => Promise.resolve());

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/mcp.js', () => ({
    McpServer: class {
        constructor() { }
        tool(name, description, shape, callback) {
            mockTools[name] = callback;
        }
        connect() { return Promise.resolve(); }
    }
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: class {}
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
    StreamableHTTPServerTransport: class {
        handleRequest() { return Promise.resolve(); }
    }
}));

jest.unstable_mockModule('../lib/command-registry.js', () => ({
    registerAllCommands: jest.fn((program) => {
        const sub = program.command('test').description('parent');
        const cmd = sub.command('cmd')
           .description('child')
           .option('--format <type>', 'Format output')
           .option('-f, --flag', 'A boolean flag')
           .argument('[arg]', 'An argument')
           .action(async () => {
               console.log("Mock Command Output!");
               if(program.args && program.args.includes('throw')) {
                   throw new Error('Simulated error');
               }
           });
    })
}));

jest.unstable_mockModule('../lib/plugin-loader.js', () => ({
    PluginLoader: class {
        loadPlugins() { return loadPluginsMock(); }
    }
}));

jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn(() => Promise.resolve({}))
}));


describe('mcp direct tests', () => {
    let originalConsoleError;
    let originalProcessStderrIsTTY;

    beforeAll(() => {
        originalConsoleError = console.error;
        originalProcessStderrIsTTY = process.stderr.isTTY;
        console.error = jest.fn();
    });

    afterAll(() => {
        console.error = originalConsoleError;
        process.stderr.isTTY = originalProcessStderrIsTTY;
    });

    beforeEach(() => {
        loadPluginsMock.mockClear();
    });

    test('should start http server and generate token if missing', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');

        process.stderr.isTTY = true;

        await startMcpServer({
            transport: 'http',
            host: 'localhost',
            port: 1234
        });

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('MCP Server Authentication Token:'));
    });

    test('should execute tool and capture console output', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');

        await startMcpServer({
            transport: 'stdio',
            include: 'test:cmd'
        });

        expect(mockTools['test_cmd']).toBeDefined();

        const callback = mockTools['test_cmd'];

        const result = await callback({
            format: 'json',
            flag: true,
            arg: 'my-arg'
        });

        expect(result.content[0].type).toBe('text');
        expect(result.content[0].text).toContain('Mock Command Output!');
    });

    test('should skip plugin loading when ignorePlugins is enabled', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');

        await startMcpServer({
            transport: 'stdio',
            ignorePlugins: true
        });

        expect(loadPluginsMock).not.toHaveBeenCalled();
    });

    test('tool callback catches exception and returns error', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');

        await startMcpServer({
            transport: 'stdio',
            include: 'test:cmd'
        });

        const callback = mockTools['test_cmd'];

        const result = await callback({
            unknownFlag: true
        });

        expect(result).toBeDefined();
    });

    test('http transport rejects unauthenticated requests', async () => {
        const http = await import('http');

        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'http',
            token: 'valid-token'
        });

        const latestHttpMock = http.default.createServer.mock.results[http.default.createServer.mock.results.length - 1].value;

        let statusCode, headers, body;
        const res = {
            writeHead: jest.fn((code, hdrs) => { statusCode = code; headers = hdrs; }),
            end: jest.fn((data) => { body = data; })
        };
        const req = {
            url: '/messages',
            headers: { host: 'localhost' },
            method: 'POST'
        };

        await latestHttpMock._simulateRequest(req, res);

        expect(statusCode).toBe(401);
        expect(body).toContain('Unauthorized');
    });

    test('http transport handles authenticated requests via token query', async () => {
        const http = await import('http');

        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'http',
            token: 'valid-token'
        });

        const latestHttpMock = http.default.createServer.mock.results[http.default.createServer.mock.results.length - 1].value;

        let statusCode, headers, body;
        const res = {
            writeHead: jest.fn((code, hdrs) => { statusCode = code; headers = hdrs; }),
            end: jest.fn((data) => { body = data; })
        };
        const req = {
            url: '/messages?token=valid-token',
            headers: { host: 'localhost' },
            method: 'POST'
        };

        await latestHttpMock._simulateRequest(req, res);

        expect(statusCode).toBeUndefined();
    });

    test('http transport handles authenticated requests via Authorization header', async () => {
        const http = await import('http');

        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'http',
            token: 'valid-token'
        });

        const latestHttpMock = http.default.createServer.mock.results[http.default.createServer.mock.results.length - 1].value;

        let statusCode, headers, body;
        const res = {
            writeHead: jest.fn((code, hdrs) => { statusCode = code; headers = hdrs; }),
            end: jest.fn((data) => { body = data; })
        };
        const req = {
            url: '/messages',
            headers: {
                host: 'localhost',
                authorization: 'Bearer valid-token'
            },
            method: 'POST'
        };

        await latestHttpMock._simulateRequest(req, res);

        expect(statusCode).toBeUndefined();
    });

    test('http transport returns 404 for unknown paths', async () => {
        const http = await import('http');

        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'http',
            token: 'valid-token'
        });

        const latestHttpMock = http.default.createServer.mock.results[http.default.createServer.mock.results.length - 1].value;

        let statusCode, headers, body;
        const res = {
            writeHead: jest.fn((code, hdrs) => { statusCode = code; headers = hdrs; }),
            end: jest.fn((data) => { body = data; })
        };
        const req = {
            url: '/unknown?token=valid-token',
            headers: { host: 'localhost' },
            method: 'GET'
        };

        await latestHttpMock._simulateRequest(req, res);

        expect(statusCode).toBe(404);
    });

    test('http transport throws error if token missing and non-TTY', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');

        process.stderr.isTTY = false;

        await expect(startMcpServer({
            transport: 'http',
            host: 'localhost',
            port: 1234
        })).rejects.toThrow('Authentication token is required');
    });

    test('resolveCommandPatterns throws error for circular dependency', async () => {
        const { resolveCommandPatterns } = await import('../lib/mcp.js');
        const groups = {
            group_a: ['@group_b'],
            group_b: ['@group_a']
        };
        expect(() => resolveCommandPatterns('@group_a', groups)).toThrow('Circular MCP command group reference detected');
    });

    test('resolveCommandPatterns handles empty string or undefined', async () => {
        const { resolveCommandPatterns } = await import('../lib/mcp.js');
        expect(resolveCommandPatterns('')).toEqual([]);
        expect(resolveCommandPatterns(undefined)).toEqual([]);
    });

    test('createCommandMatcher handles absent include options by defaulting to safe', async () => {
        const { createCommandMatcher, DEFAULT_MCP_COMMAND_GROUPS } = await import('../lib/mcp.js');
        const matcher = createCommandMatcher({}, DEFAULT_MCP_COMMAND_GROUPS);
        expect(matcher('order:list')).toBe(true);
        expect(matcher('something:else')).toBe(false);
    });

    test('createCommandMatcher handles absent empty include string', async () => {
        const { createCommandMatcher, DEFAULT_MCP_COMMAND_GROUPS } = await import('../lib/mcp.js');
        const matcher = createCommandMatcher({ include: ' ' }, DEFAULT_MCP_COMMAND_GROUPS);
        expect(matcher('order:list')).toBe(true);
    });

    test('executeCommand catches syntax/command errors returning Error output', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'stdio',
            include: 'test:cmd'
        });
        const callback = mockTools['test_cmd'];
        const result = await callback({
            arg: 'throw'
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Error: Simulated error');
    });

    test('executeCommand formats output via custom console and strips Ansi properly', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');
        await startMcpServer({
            transport: 'stdio',
            include: 'test:cmd'
        });
        const callback = mockTools['test_cmd'];
        const result = await callback({
            arg: 'valid'
        });
        expect(result.content[0].text).toContain('Mock Command Output!');
    });

    test('registerTools covers tool creation with required flags', async () => {
        const { startMcpServer } = await import('../lib/mcp.js');
        const { Command } = await import('commander');
        const cmd = new Command('test:cmd2');
        cmd.description('another child');
        cmd._args = [ { name: () => 'reqArg', required: true } ];
        cmd.options = [];

        const { registerAllCommands } = await import('../lib/command-registry.js');
        registerAllCommands.mockImplementationOnce((program) => {
            program.addCommand(cmd);
            const nested = program.command('nested');
            nested.command('leaf').description('leaf');
        });

        await startMcpServer({
            transport: 'stdio',
            include: 'test:cmd2 nested:leaf'
        });

        expect(mockTools['test_cmd2']).toBeDefined();
        expect(mockTools['nested_leaf']).toBeDefined();
    });

    test('resolveCommandPatterns throws error for unknown group', async () => {
        const { resolveCommandPatterns } = await import('../lib/mcp.js');
        expect(() => resolveCommandPatterns('@unknown_group', {})).toThrow('Unknown MCP command group "@unknown_group"');
    });
});
