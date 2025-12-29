import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import http from "http";
import chalk from "chalk";
import { Command } from "commander";
import { readFileSync } from "fs";

// Import command registry
import { registerAllCommands } from './command-registry.js';

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
    const program = setupProgram();

    const server = new McpServer({
        name: "mage-remote-run",
        version: packageJson.version
    });

    const toolsCount = registerTools(server, program);

    if (options.transport === 'http') {
        const host = options.host || '127.0.0.1';
        const port = options.port || 18098;

        const transport = new StreamableHTTPServerTransport();

        const httpServer = http.createServer(async (req, res) => {
            if (req.url === '/sse' || (req.url === '/messages' && req.method === 'POST')) {
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
function setupProgram() {
    const program = new Command();

    // Silence output for the main program instance to avoid double printing during parsing
    program.configureOutput({
        writeOut: (str) => { },
        writeErr: (str) => { }
    });

    registerAllCommands(program);

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
        const program = setupProgram();

        // Construct argv
        // We need to build [node, script, command, subcommand, ..., args, options]
        const argv = ['node', 'mage-remote-run'];

        // Reconstruct command path
        if (parentName) {
            // parentName might be "website" or "website_domain" (if nested deeper? current logic supports 1 level nesting)
            // Current processCommand logic: `cmdName = parentName ? ${parentName}_${cmd.name()} : cmd.name()`
            // But parentName passed to executeCommand is the prefix.
            // Wait, registerTools calls: `executeCommand(cmd, args, parentName)`
            // If parentName is "website", and cmd is "list", we need "website list"

            // NOTE: parentName in processCommand is built recursively with underscores? 
            // In processCommand(subCmd, cmdName), cmdName is "parent_sub". 
            // So if we have website -> list. 
            // processCommand(website) -> processCommand(list, "website")
            // parentName in executeCommand is "website".
            // cmd.name() is "list".

            // However, parentName might contain underscores if deeper nesting?
            // "store_config_list" -> parent "store_config", cmd "list".
            // Commander commands are usually space separated in argv.

            // We need to parse parentName back to argv tokens?
            // Or better: store the "command path" as an array in the tool context.

            // Let's rely on standard splitting by underscore, assuming command names don't have underscores.
            // Or we can assume parentName matches the command structure.

            // Safest: splitting parentName by UNDERSCORE might be risky if command names have underscores.
            // But standard commands here: website, store, etc. don't.

            // Actually, we can just push parentName, then cmd.name()
            // But parentName comes from `cmdName` variable passed as `parentName` to recursive call.
            // `processCommand(subCmd, cmdName)`
            // `cmdName` = `parentName_cmd.name()`.
            // So for `website list`:
            // `processCommand(website, '')` -> `cmdName="website"`.
            //   -> `processCommand(list, "website")`. 
            //      -> register tool "website_list". `parentName` passed to execute is "website".

            // So `parentName` is the accumulated prefix with underscores.

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
