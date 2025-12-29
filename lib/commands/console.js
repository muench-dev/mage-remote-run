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

            // State for the REPL
            let localProgram;
            let currentProfile;

            // Function to load/reload commands based on current profile
            const loadLocalCommands = async () => {
                // Create a fresh program instance for the REPL
                localProgram = new Command();

                // Configure custom output for REPL to avoid duplicate error printing
                localProgram.configureOutput({
                    writeOut: (str) => process.stdout.write(str),
                    writeErr: (str) => process.stderr.write(str),
                });

                // Apply exitOverride recursively
                const applyExitOverride = (cmd) => {
                    cmd.exitOverride((err) => {
                        throw err;
                    });
                    if (cmd.commands) {
                        cmd.commands.forEach(applyExitOverride);
                    }
                };

                // Get current profile and register commands
                const profile = await getActiveProfile();
                registerCommands(localProgram, profile);
                applyExitOverride(localProgram);

                // Update current profile state (store simple unique string for comparison)
                currentProfile = profile ? `${profile.name}:${profile.type}` : 'null';

                return { localProgram, profile };
            };

            // Initial load
            await loadLocalCommands();

            // Use 'stream' module to create dummy REPL for capturing defaults
            const { PassThrough } = await import('stream');
            const dummy = repl.start({ input: new PassThrough(), output: new PassThrough(), terminal: false });
            const defaultCompleter = dummy.completer;
            const defaultEval = dummy.eval;
            dummy.close();

            // Custom completer definition
            const myCompleter = (line, callback) => {
                const parts = line.split(/\s+/);
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

                const getCandidates = (cmdObj) => {
                    return cmdObj.commands.map(c => c.name());
                };

                let hits = [];

                if (contextParts.length === 0) {
                    const candidates = getCandidates(localProgram);
                    hits = candidates.filter(c => c.startsWith(current));
                } else {
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

                if (hits.length > 0) {
                    return callback(null, [hits, current]);
                }

                return defaultCompleter(line, callback);
            };

            // Custom evaluator definition
            const myEval = async function (cmd, context, filename, callback) {
                // 'this' is the REPLServer instance
                const rInstance = this;

                cmd = cmd.trim();

                if (!cmd) {
                    callback(null);
                    return;
                }

                if (cmd === 'list') {
                    console.log(chalk.bold('\nAvailable Commands:'));
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
                    const args = (cmd.match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || []).map(arg => {
                        if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);
                        if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1);
                        return arg;
                    });

                    if (args.length > 0) {
                        if (process.env.DEBUG) {
                            console.log(chalk.gray('DEBUG: Parsing args:'), args);
                        }
                        let expandedArgs;
                        try {
                            expandedArgs = expandCommandAbbreviations(localProgram, args);
                            if (process.env.DEBUG) {
                                console.log(chalk.gray('DEBUG: Expanded args:'), expandedArgs);
                            }
                        } catch (e) {
                            if (e.isAmbiguous) {
                                console.error(chalk.red(e.message));
                                callback(null);
                                return;
                            }
                            throw e;
                        }

                        const firstWord = expandedArgs[0];
                        const knownCommands = localProgram.commands.map(c => c.name());

                        if (knownCommands.includes(firstWord)) {
                            // Valid command found
                            // Valid command found
                            try {
                                rInstance.pause();

                                // Capture and remove keypress listeners to prevent REPL from intercepting input
                                // intended for interactive commands (like inquirer)
                                const keypressListeners = process.stdin.listeners('keypress');
                                process.stdin.removeAllListeners('keypress');

                                if (process.stdin.isTTY) {
                                    process.stdin.setRawMode(false);
                                }

                                await localProgram.parseAsync(['node', 'mage-remote-run', ...expandedArgs]);

                                // Check for profile change after command execution
                                const newProfileObj = await getActiveProfile();
                                const newProfileKey = newProfileObj ? `${newProfileObj.name}:${newProfileObj.type}` : 'null';

                                if (process.env.DEBUG) {
                                    console.log(chalk.gray(`DEBUG: Check Profile Switch. Current: ${currentProfile}, New: ${newProfileKey}`));
                                }

                                if (newProfileKey !== currentProfile) {
                                    await loadLocalCommands();
                                    // Update context variables
                                    rInstance.context.config = await loadConfig();

                                    if (process.env.DEBUG) {
                                        console.log(chalk.green(`\nConnection switched to ${newProfileObj ? newProfileObj.name : 'none'}. Commands reloaded.`));
                                    }
                                }

                                // Restore REPL state
                                setTimeout(() => {
                                    // Restore keypress listeners
                                    keypressListeners.forEach(fn => process.stdin.on('keypress', fn));

                                    if (process.stdin.isTTY) {
                                        process.stdin.setRawMode(true);
                                    }
                                    process.stdin.resume();

                                    // Flush stdin to remove any buffered leftovers
                                    let chunk;
                                    while ((chunk = process.stdin.read()) !== null) { }

                                    rInstance.resume();
                                    rInstance.displayPrompt(true);
                                }, 100);

                            } catch (e) {
                                if (process.stdin.isTTY) {
                                    process.stdin.setRawMode(true);
                                }
                                process.stdin.resume();
                                rInstance.resume();

                                if (e.code === 'commander.helpDisplayed') {
                                    // Help was displayed, clean exit for us
                                    setImmediate(() => rInstance.displayPrompt());
                                } else if (e.code === 'commander.unknownOption' || e.code === 'commander.unknownCommand') {
                                    console.error(chalk.red(e.message));
                                    setImmediate(() => rInstance.displayPrompt());
                                } else {
                                    if (e.code) {
                                        // Likely a commander exit error we rethrew
                                        setImmediate(() => rInstance.displayPrompt());
                                    } else {
                                        console.error(chalk.red('Command execution error:'), e);
                                        setImmediate(() => rInstance.displayPrompt());
                                    }
                                }
                            }
                            callback(null);
                            return;
                        }
                    }
                } catch (e) {
                    // unexpected error
                }

                // Fallback to default eval which supports top-level await
                return defaultEval.call(rInstance, cmd, context, filename, callback);
            };

            const r = repl.start({
                prompt: chalk.green('mage> '),
                eval: myEval,
                completer: myCompleter
            });

            r.context.client = createClient;
            r.context.config = await loadConfig();
            r.context.chalk = chalk;

            // Helper to reload config if changed
            r.context.reload = async () => {
                r.context.config = await loadConfig();
                // We should also reload commands here in case a manual config edit changed the type
                await loadLocalCommands();
                console.log(chalk.gray('Config and commands reloaded.'));
            };

            r.on('exit', () => {
                process.exit();
            });
        });
}
