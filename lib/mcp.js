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

    const toolsCount = registerTools(server, program);

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

function registerTools(server, program) {
    let count = 0;

    function processCommand(cmd, parentName = '') {
        const cmdName = parentName ? `${parentName}_${cmd.name()}` : cmd.name();

        // If it has subcommands, process them
        if (cmd.commands && cmd.commands.length > 0) {
            cmd.commands.forEach(subCmd => processCommand(subCmd, cmdName));
            return;
        }

        // It's a leaf command, register as tool
        // Tool name: Replace spaces/colons with underscores.
        // Example: website list -> website_list
        const toolName = cmdName.replace(/[^a-zA-Z0-9_]/g, '_');

        const schema = {};

        // Arguments
        // Commander args: cmd._args
        // Options: cmd.options

        const zodShape = {};

        cmd._args.forEach(arg => {
            // arg.name(), arg.required
            if (arg.required) {
                zodShape[arg.name()] = z.string().describe(arg.description || '');
            } else {
                zodShape[arg.name()] = z.string().optional().describe(arg.description || '');
            }
        });

        cmd.options.forEach(opt => {
            const name = opt.name(); // e.g. "format" for --format
            // Check flags to guess type.
            // -f, --format <type> -> string
            // -v, --verbose -> boolean

            if (opt.flags.includes('<')) {
                // Takes an argument, assume string
                zodShape[name] = z.string().optional().describe(opt.description);
            } else {
                // Boolean flag
                zodShape[name] = z.boolean().optional().describe(opt.description);
            }
        });

        const description = cmd.description() || `Execute mage-remote-run ${cmdName.replace(/_/g, ' ')}`;

        server.tool(
            toolName,
            description,
            zodShape,
            async (args) => {
                return await executeCommand(cmd, args, parentName);
            }
        );
        count++;
    }


    program.commands.forEach(cmd => processCommand(cmd));
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

async function executeCommand(cmdDefinition, args, parentName) {
    // cmdDefinition is the original command object from discovery, used for context if needed,
    // but here we mainly need the path to find it in the new program.
    // Actually, we can just reconstruct the path from parentName + cmd.name()

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

        // Reconstruct command path
        if (parentName) {
            const parts = parentName.split('_');
            argv.push(...parts);
        }

        argv.push(cmdDefinition.name());

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
