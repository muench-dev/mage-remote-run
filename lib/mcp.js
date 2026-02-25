import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";
import crypto from "crypto";
import chalk from "chalk";
import { Command } from "commander";
import { readFileSync } from "fs";

// Import command registry
import { registerAllCommands } from './command-registry.js';
import { PluginLoader } from './plugin-loader.js';
import { loadConfig } from './config.js';
import { eventBus, AppEventBus, events } from './events.js';

const DEFAULT_INCLUDE_EXPRESSION = '@safe';

export const DEFAULT_MCP_COMMAND_GROUPS = {
    risky: ['*'],
    all: ['@risky'],

    connection: ['connection:*'],
    website: ['website:*'],
    store: ['store:*'],
    customer: ['customer:*'],
    order: ['order:*'],
    product: ['product:*'],
    cart: ['cart:*'],
    tax: ['tax:*'],
    inventory: ['inventory:*'],
    shipment: ['shipment:*'],
    event: ['event:*'],
    webhook: ['webhook:*'],
    company: ['company:*'],
    'po-cart': ['po-cart:*'],
    import: ['import:*'],
    module: ['module:*'],
    plugin: ['plugin:*'],
    rest: ['rest'],
    console: ['console'],

    sales: ['@order', '@shipment', '@cart'],
    catalog: ['@product', '@inventory', '@tax', '@eav'],
    eav: ['eav:*'],
    cloud: ['@event', '@webhook'],
    commerce: ['@company', '@po-cart'],

    safe: [
        'connection:list',
        'connection:search',
        'connection:test',
        'connection:status',

        'website:list',
        'website:search',

        'store:group:list',
        'store:group:search',
        'store:view:list',
        'store:view:search',
        'store:config:list',

        'customer:list',
        'customer:search',
        'customer:show',
        'customer:group:list',

        'order:list',
        'order:search',
        'order:show',
        'order:latest',

        'product:list',
        'product:show',
        'product:media:list',
        'product:type:list',
        'product:attribute:list',
        'product:attribute:show',
        'product:attribute:type:list',
        'product:link-type:list',

        'tax:class:list',
        'tax:class:show',

        'inventory:stock:list',
        'inventory:stock:show',
        'inventory:resolve-stock',
        'inventory:source:list',
        'inventory:source:selection-algorithm:list',

        'shipment:list',
        'shipment:show',

        'event:check-configuration',
        'event:provider:list',
        'event:provider:show',
        'event:supported-list',

        'webhook:list',
        'webhook:supported-list',
        'webhook:show',

        'company:list',
        'company:show',
        'company:structure',
        'company:role:list',
        'company:role:show',
        'company:credit:show',
        'company:credit:history',

        'po-cart:totals',
        'po-cart:shipping-methods',
        'po-cart:payment-info',

        'eav:attribute-set:list',
        'eav:attribute-set:show',

        'module:list',
        'plugin:list'
    ]
};

// Helper to strip ANSI codes for cleaner output
function stripAnsi(str) {
    return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

/**
 * Starts the MCP server.
 * @param {Object} options Configuration options
 * @param {string} options.transport 'stdio' or 'http'
 * @param {string} [options.host] Host for HTTP server
 * @param {number} [options.port] Port for HTTP server
 */
export async function startMcpServer(options) {
    const packageJson = JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url))
    );

    // 1. Setup a dynamic program to discovery commands
    const program = await setupProgramAsync();

    const server = new McpServer({
        name: "mage-remote-run",
        version: packageJson.version
    });

    eventBus.emit(events.MCP_START, { server, options });

    const toolsCount = registerTools(server, program, options);

    if (options.transport === 'http') {
        const host = options.host || '127.0.0.1';
        const port = options.port || 18098;

        // Authentication logic
        let token = options.token || process.env.MAGE_REMOTE_RUN_MCP_TOKEN;

        if (!token) {
            token = crypto.randomBytes(16).toString('hex');
            console.error(chalk.yellow(`--------------------------------------------------------------------------------`));
            console.error(chalk.yellow(`MCP Server Authentication Token: `) + chalk.green.bold(token));
            console.error(chalk.yellow(`Use this token to connect to the MCP server via ?token=${token}`));
            console.error(chalk.yellow(`--------------------------------------------------------------------------------`));
        }

        const transport = new StreamableHTTPServerTransport();

        const httpServer = http.createServer(async (req, res) => {
            const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const pathname = requestUrl.pathname;

            // Check authentication
            const queryToken = requestUrl.searchParams.get('token');
            const authHeader = req.headers.authorization;

            let authenticated = false;

            try {
                if (queryToken && queryToken.length === token.length && crypto.timingSafeEqual(Buffer.from(queryToken), Buffer.from(token))) {
                    authenticated = true;
                } else if (authHeader && authHeader.startsWith('Bearer ')) {
                    const headerToken = authHeader.substring(7);
                    if (headerToken.length === token.length && crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(token))) {
                        authenticated = true;
                    }
                }
            } catch (e) {
                // Ignore crypto errors (e.g. encoding issues)
            }

            if (!authenticated) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Unauthorized', message: 'Invalid or missing authentication token' }));
                return;
            }

            if (pathname === '/sse' || (pathname === '/messages' && req.method === 'POST')) {
                // Ensure query parameters don't interfere with transport handling if it expects exact path
                req.url = pathname;
                await transport.handleRequest(req, res);
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        httpServer.listen(port, host, () => {
            console.error(`MCP Server running on http://${host}:${port}`);
            console.error(`Protocol: HTTP (SSE)`);
            console.error(`Registered Tools: ${toolsCount}`);
        });

        await server.connect(transport);

    } else {
        // STDIO
         console.error(`Protocol: stdio`);
         console.error(`Registered Tools: ${toolsCount}`);
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }
}

function collectLeafCommands(program) {
    const leafCommands = [];

    function processCommand(cmd, parentSegments = []) {
        const currentSegments = [...parentSegments, cmd.name()];

        if (cmd.commands && cmd.commands.length > 0) {
            cmd.commands.forEach(subCmd => processCommand(subCmd, currentSegments));
            return;
        }

        leafCommands.push({
            command: cmd,
            segments: currentSegments,
            commandPath: currentSegments.join(':').toLowerCase()
        });
    }

    program.commands.forEach(cmd => processCommand(cmd));
    return leafCommands;
}

function splitExpressionTokens(expression = '') {
    return expression
        .split(/[\s,]+/)
        .map(token => token.trim())
        .filter(Boolean);
}

function normalizePatternToken(token) {
    return token
        .toLowerCase()
        .replace(/\s+/g, ':')
        .replace(/_+/g, ':');
}

function wildcardToRegex(pattern) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`^${escaped.replace(/\\\*/g, '.*')}$`);
}

export function resolveCommandPatterns(expression, groups = DEFAULT_MCP_COMMAND_GROUPS) {
    const tokens = splitExpressionTokens(expression || '');

    if (tokens.length === 0) {
        return [];
    }

    const resolved = [];

    function resolveToken(token, stack = []) {
        if (token.startsWith('@')) {
            const groupName = token.slice(1).toLowerCase();
            if (!groups[groupName]) {
                throw new Error(`Unknown MCP command group "@${groupName}"`);
            }

            if (stack.includes(groupName)) {
                throw new Error(`Circular MCP command group reference detected: ${[...stack, groupName].join(' -> ')}`);
            }

            groups[groupName].forEach(entry => resolveToken(entry, [...stack, groupName]));
            return;
        }

        resolved.push(normalizePatternToken(token));
    }

    tokens.forEach(token => resolveToken(token));
    return resolved;
}

export function createCommandMatcher(options = {}, groups = DEFAULT_MCP_COMMAND_GROUPS) {
    const includeExpression = options.include ? options.include : DEFAULT_INCLUDE_EXPRESSION;
    const excludeExpression = options.exclude || '';

    const includePatterns = resolveCommandPatterns(includeExpression, groups);
    const excludePatterns = resolveCommandPatterns(excludeExpression, groups);

    const includeRegexes = includePatterns.map(wildcardToRegex);
    const excludeRegexes = excludePatterns.map(wildcardToRegex);

    return (commandPath) => {
        const normalizedPath = commandPath.toLowerCase();
        const included = includeRegexes.length === 0 || includeRegexes.some(regex => regex.test(normalizedPath));
        const excluded = excludeRegexes.some(regex => regex.test(normalizedPath));

        return included && !excluded;
    };
}

function registerTools(server, program, options = {}) {
    let count = 0;
    const shouldRegister = createCommandMatcher(options);

    const leafCommands = collectLeafCommands(program);

    leafCommands.forEach(({ command: cmd, segments, commandPath }) => {
        if (!shouldRegister(commandPath)) {
            return;
        }

        const toolName = commandPath.replace(/[^a-zA-Z0-9_]/g, '_');

        const zodShape = {};

        cmd._args.forEach(arg => {
            if (arg.required) {
                zodShape[arg.name()] = z.string().describe(arg.description || '');
            } else {
                zodShape[arg.name()] = z.string().optional().describe(arg.description || '');
            }
        });

        cmd.options.forEach(opt => {
            const name = opt.name();

            if (opt.flags.includes('<')) {
                zodShape[name] = z.string().optional().describe(opt.description);
            } else {
                zodShape[name] = z.boolean().optional().describe(opt.description);
            }
        });

        const description = cmd.description() || `Execute mage-remote-run ${segments.join(' ')}`;

        server.tool(
            toolName,
            description,
            zodShape,
            async (args) => {
                return await executeCommand(cmd, args, segments);
            }
        );
        count++;
    });

    return count;
}

// Re-register all commands on a fresh program instance
// We export this logic so we can reuse it
async function setupProgramAsync() {
    const program = new Command();

    // Silence output for the main program instance to avoid double printing during parsing
    program.configureOutput({
        writeOut: (str) => { },
        writeErr: (str) => { }
    });

    const localEventBus = new AppEventBus();

    const appContext = {
        program,
        config: await loadConfig(),
        profile: null, // MCP uses all commands, usually? Or should we use active profile?
        // registerAllCommands registers everything. Plugins might need to know if they should register.
        // Assuming plugins register globally for now or handle checking config themselves.
        eventBus: localEventBus,
        events
    };

    const pluginLoader = new PluginLoader(appContext);
    await pluginLoader.loadPlugins();

    localEventBus.emit(events.INIT, appContext);

    registerAllCommands(program);

    program.hook('preAction', async (thisCommand, actionCommand) => {
        localEventBus.emit(events.BEFORE_COMMAND, { thisCommand, actionCommand, profile: null });
    });

    program.hook('postAction', async (thisCommand, actionCommand) => {
        localEventBus.emit(events.AFTER_COMMAND, { thisCommand, actionCommand, profile: null });
    });

    return program;
}

async function executeCommand(cmdDefinition, args, commandSegments) {
    // Intercept Console
    let output = '';
    const originalLog = console.log;
    const originalError = console.error;

    // Simple custom logger
    const logInterceptor = (...msgArgs) => {
        const line = msgArgs.map(String).join(' ');
        output += stripAnsi(line) + '\n';
    };

    console.log = logInterceptor;
    console.error = logInterceptor;

    try {
        const program = await setupProgramAsync();

        // Construct argv
        // We need to build [node, script, command, subcommand, ..., args, options]
        const argv = ['node', 'mage-remote-run'];

        argv.push(...commandSegments);

        // Add arguments and options from the tool args

        // 1. Positional arguments
        cmdDefinition._args.forEach(arg => {
            if (args[arg.name()]) {
                argv.push(args[arg.name()]);
            }
        });

        // 2. Options
        cmdDefinition.options.forEach(opt => {
            const name = opt.name(); // e.g. "format"
            if (args[name] !== undefined) {
                const val = args[name];
                if (opt.flags.includes('<')) {
                    // String option
                    argv.push(`--${name}`);
                    argv.push(val);
                } else {
                    // Boolean flag
                    if (val === true) {
                        argv.push(`--${name}`);
                    }
                }
            }
        });

        // Execute
        await program.parseAsync(argv);

        return {
            content: [{ type: "text", text: output }]
        };

    } catch (e) {
        // Commander throws nicely formatted errors usually, but we suppressed output.
        // If it throws, it might be a cleaner exit error.
        return {
            content: [{ type: "text", text: output + `\nError: ${e.message}` }],
            isError: true
        };
    } finally {
        console.log = originalLog;
        console.error = originalError;
    }
}
