import repl from 'repl';
import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../api/factory.js';
import { loadConfig, getActiveProfile } from '../config.js';
import { registerCommands } from '../command-registry.js';
import { expandCommandAbbreviations } from '../command-helper.js';

export function registerConsoleCommand(program) {
    program
        .command('console')
        .alias('repl')
        .description('Start an interactive console')
        .option('-d, --debug', 'Enable debug output')
        .action(async (options) => {
            if (options.debug) {
                process.env.DEBUG = '1';
                console.log(chalk.gray('Debug mode enabled'));
            }

            console.log(chalk.bold.blue('Mage Remote Run Interactive Console'));
            console.log(chalk.gray('Type your commands directly or write JS code.'));
            console.log(chalk.gray('Global variables available: client (async factory), config, chalk'));
            console.log(chalk.gray('Example JS: await (await client()).get("V1/store/websites")'));
            console.log(chalk.gray('Type "list" to see available commands.'));
            console.log(chalk.gray('Type .exit to quit.\n'));

            // Create a fresh program instance for the REPL
            const localProgram = new Command();

            // Configure custom output for REPL to avoid duplicate error printing when we catch it
            localProgram.configureOutput({
                writeOut: (str) => process.stdout.write(str),
                writeErr: (str) => process.stderr.write(str),
            });

            // Apply exitOverride recursively to ensure all subcommands (and sub-subcommands)
            // handle help/errors without exiting the process.
            const applyExitOverride = (cmd) => {
                cmd.exitOverride((err) => {
                    throw err;
                });
                // Check for subcommands
                if (cmd.commands) {
                    cmd.commands.forEach(applyExitOverride);
                }
            };

            // Register all commands on the local instance
            const profile = await getActiveProfile();
            registerCommands(localProgram, profile);

            // Apply overrides AFTER registration to catch all commands
            applyExitOverride(localProgram);

            const r = repl.start({
                prompt: chalk.green('mage> '),
                // We do NOT provide 'eval' here so we get the default one which supports top-level await
            });

            const defaultEval = r.eval;

            // Capture default completer
            const defaultCompleter = r.completer;

            // Custom completer
            const myCompleter = (line, callback) => {
                const parts = line.split(/\s+/);
                // Remove empty start if line starts with space (not typical for completion line but safe)
                if (parts[0] === '') parts.shift();

                let current = '';
                let contextParts = [];

                if (line.match(/\s$/)) {
                    current = '';
                    contextParts = parts.filter(p => p.length > 0);
                } else {
                    current = parts.pop();
                    contextParts = parts;
                }

                // Helper to get candidates from a command object
                const getCandidates = (cmdObj) => {
                    return cmdObj.commands.map(c => c.name());
                };

                let hits = [];

                // Top-level completion (start of line)
                if (contextParts.length === 0) {
                    const candidates = getCandidates(localProgram);
                    hits = candidates.filter(c => c.startsWith(current));
                } else {
                    // Subcommand completion
                    let cmd = localProgram;
                    let validContext = true;

                    for (const part of contextParts) {
                        const found = cmd.commands.find(c => c.name() === part || (c.aliases && c.aliases().includes(part)));
                        if (found) {
                            cmd = found;
                        } else {
                            validContext = false;
                            break;
                        }
                    }

                    if (validContext) {
                        const candidates = getCandidates(cmd);
                        hits = candidates.filter(c => c.startsWith(current));
                    }
                }

                // If we have distinct command hits, return them
                if (hits.length > 0) {
                    return callback(null, [hits, current]);
                }

                // Fallback to default JS completion
                return defaultCompleter(line, callback);
            };

            // Override completer
            r.completer = myCompleter;

            // Custom evaluator to support both CLI commands and JS
            const myEval = async (cmd, context, filename, callback) => {
                cmd = cmd.trim();

                if (!cmd) {
                    callback(null);
                    return;
                }

                if (cmd === 'list') {
                    console.log(chalk.bold('\nAvailable Commands:'));
                    // Use localProgram commands
                    localProgram.commands.filter(c => !c._hidden).sort((a, b) => a.name().localeCompare(b.name())).forEach(c => {
                        console.log(`  ${chalk.cyan(c.name().padEnd(25))} ${c.description()}`);
                    });
                    console.log('');
                    callback(null);
                    return;
                }

                if (cmd === 'help') {
                    localProgram.outputHelp();
                    callback(null);
                    return;
                }

                try {
                    // Parse arguments nicely
                    // This regex handles quoted arguments
                    const args = (cmd.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || []).map(arg => {
                        if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
                        if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1);
                        return arg;
                    });

                    if (args.length > 0) {
                        if (process.env.DEBUG) {
                            console.log(chalk.gray('DEBUG: Parsing args:'), args);
                        }
                        let expandedArgs = args;
                        try {
                            expandedArgs = expandCommandAbbreviations(localProgram, args);
                            if (process.env.DEBUG) {
                                console.log(chalk.gray('DEBUG: Expanded args:'), expandedArgs);
                            }
                        } catch (e) {
                            if (e.isAmbiguous) {
                                // If ambiguous, print error and return (don't execute JS, as user likelihood meant a command)
                                // But wait, what if "c" is a var? 
                                // If I type "c", it is ambiguous. 
                                // If I fallback to JS, "c" might work.
                                // If I print error, "c" access is blocked.

                                // Compromise: If it LOOKS like a command usage (e.g. multiple args), treat as command error?
                                // Or just always fallback to JS if ambiguous? 
                                // If fallback to JS, user sees "c is not defined". 
                                // User asks: "Why didn't it run command?". Answer: "Ambiguous". 
                                // Explicit ambiguity error is arguably better than generic ReferenceError.

                                // However, "c = 1" or "const c = 1"
                                // "const" -> ambiguous? "connection", "console"... no "const" is not in list of commands. 
                                // "const" might NOT match any command prefix if lucky.
                                // But if it does...

                                // Let's stick to safe approach: fallback to JS if ambiguous, unless we are SURE it's not JS?
                                // Or: Just print the ambiguous error if the first arg matched *something*.

                                // Let's try to assume command first. If ambiguous, show error.
                                console.error(chalk.red(e.message));
                                callback(null);
                                return;
                            }
                            // Other errors?
                            throw e;
                        }

                        const firstWord = expandedArgs[0];
                        const knownCommands = localProgram.commands.map(c => c.name());

                        if (knownCommands.includes(firstWord)) {
                            // Valid command found
                            try {
                                r.pause();
                                await localProgram.parseAsync(['node', 'mage-remote-run', ...expandedArgs]);

                                // Restore REPL state
                                if (process.stdin.isTTY) {
                                    process.stdin.setRawMode(true);
                                }
                                process.stdin.resume();
                                r.resume();
                                r.displayPrompt();
                            } catch (e) {
                                if (process.stdin.isTTY) {
                                    process.stdin.setRawMode(true);
                                }
                                process.stdin.resume();
                                r.resume();
                                if (e.code === 'commander.helpDisplayed') {
                                    // Help was displayed, clean exit for us
                                } else if (e.code === 'commander.unknownOption' || e.code === 'commander.unknownCommand') {
                                    console.error(chalk.red(e.message));
                                } else {
                                    if (e.code) {
                                        // Likely a commander exit error we rethrew
                                    } else {
                                        console.error(chalk.red('Command execution error:'), e);
                                    }
                                }
                            }
                            callback(null);
                            return;
                        }
                    }
                } catch (e) {
                    // unexpected error during CLI detection
                }

                // Fallback to default eval which supports top-level await
                defaultEval.call(r, cmd, context, filename, callback);
            };

            // Override the eval function
            r.eval = myEval;

            // Initialize context
            r.context.client = createClient;
            r.context.config = await loadConfig();
            r.context.chalk = chalk;
            r.context.program = program; // Expose global program just in case? Or local?
            r.context.localProgram = localProgram; // Expose local debugging

            // Helper to reload config if changed
            r.context.reload = async () => {
                r.context.config = await loadConfig();
                console.log(chalk.gray('Config reloaded.'));
            };

            r.on('exit', () => {
                process.exit();
            });
        });
}
