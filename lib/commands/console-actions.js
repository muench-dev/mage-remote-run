import repl from 'repl';
import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../api/factory.js';
import { loadConfig, getActiveProfile } from '../config.js';
import { registerCommands } from '../command-registry.js';
import { expandCommandAbbreviations } from '../command-helper.js';

export async function startConsoleAction(options) {
    if (options.debug) {
        process.env.DEBUG = '1';
        console.log(chalk.gray('Debug mode enabled'));
    }

    if (process.env.NODE_ENV !== 'test') {
        console.log(chalk.bold.blue('Mage Remote Run Interactive Console'));
        console.log(chalk.gray('Type your commands directly or write JS code.'));
        console.log(chalk.gray('Global variables available: client (async factory), config, chalk'));
        console.log(chalk.gray('Example JS: await (await client()).get("V1/store/websites")'));
        console.log(chalk.gray('Type "list" to see available commands.'));
        console.log(chalk.gray('Type .exit to quit.\n'));
    }

    let localProgram;
    let currentProfile;

    const loadLocalCommands = async () => {
        localProgram = new Command();

        localProgram.configureOutput({
            writeOut: str => process.stdout.write(str),
            writeErr: str => process.stderr.write(str)
        });

        const applyExitOverride = cmd => {
            cmd.exitOverride(err => {
                throw err;
            });
            if (cmd.commands) cmd.commands.forEach(applyExitOverride);
        };

        const profile = await getActiveProfile();
        registerCommands(localProgram, profile);
        applyExitOverride(localProgram);

        currentProfile = profile ? `${profile.name}:${profile.type}` : 'null';
        return { localProgram, profile };
    };

    await loadLocalCommands();

    const { PassThrough } = await import('stream');
    const dummy = repl.start({ input: new PassThrough(), output: new PassThrough(), terminal: false });
    const defaultCompleter = dummy.completer;
    const defaultEval = dummy.eval;
    dummy.close();

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

        const getCandidates = cmdObj => cmdObj.commands.map(c => c.name());

        let hits = [];
        if (contextParts.length === 0) {
            const candidates = getCandidates(localProgram);
            hits = candidates.filter(c => c.startsWith(current));
        } else {
            let cmd = localProgram;
            let validContext = true;

            for (const part of contextParts) {
                const found = cmd.commands.find(c => c.name() === part || (c.aliases && c.aliases().includes(part)));
                if (found) cmd = found;
                else {
                    validContext = false;
                    break;
                }
            }

            if (validContext) {
                const candidates = getCandidates(cmd);
                hits = candidates.filter(c => c.startsWith(current));
            }
        }

        if (hits.length > 0) return callback(null, [hits, current]);
        return defaultCompleter(line, callback);
    };

    const myEval = async function (cmd, context, filename, callback) {
        const rInstance = this;
        cmd = cmd.trim();

        if (!cmd) {
            callback(null);
            return;
        }

        if (cmd === 'list') {
            console.log(chalk.bold('\nAvailable Commands:'));
            localProgram.commands
                .filter(c => !c._hidden)
                .sort((a, b) => a.name().localeCompare(b.name()))
                .forEach(c => {
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
                const blockedCommands = new Set(['console', 'mcp']);
                if (blockedCommands.has(firstWord)) {
                    const blockedLabel = firstWord === 'console' ? 'console/repl' : firstWord;
                    console.error(chalk.red(`Command "${blockedLabel}" is not available inside the console.`));
                    callback(null);
                    return;
                }

                const knownCommands = localProgram.commands.map(c => c.name());
                if (knownCommands.includes(firstWord)) {
                    let keypressListeners = [];
                    try {
                        rInstance.pause();

                        keypressListeners = process.stdin.listeners('keypress');
                        process.stdin.removeAllListeners('keypress');

                        if (process.stdin.isTTY) process.stdin.setRawMode(false);

                        await localProgram.parseAsync(['node', 'mage-remote-run', ...expandedArgs]);

                        const newProfileObj = await getActiveProfile();
                        const newProfileKey = newProfileObj ? `${newProfileObj.name}:${newProfileObj.type}` : 'null';

                        if (process.env.DEBUG) {
                            console.log(chalk.gray(`DEBUG: Check Profile Switch. Current: ${currentProfile}, New: ${newProfileKey}`));
                        }

                        if (newProfileKey !== currentProfile) {
                            await loadLocalCommands();
                            rInstance.context.config = await loadConfig();

                            if (process.env.DEBUG) {
                                console.log(chalk.green(`\nConnection switched to ${newProfileObj ? newProfileObj.name : 'none'}. Commands reloaded.`));
                            }
                        }

                        setTimeout(() => {
                            keypressListeners.forEach(fn => process.stdin.on('keypress', fn));
                            if (process.stdin.isTTY) process.stdin.setRawMode(true);
                            process.stdin.resume();

                            while (process.stdin.read() !== null) {
                                // flush
                            }

                            rInstance.resume();
                            rInstance.displayPrompt(true);
                        }, 100);
                    } catch (e) {
                        keypressListeners.forEach(fn => process.stdin.on('keypress', fn));
                        if (process.stdin.isTTY) process.stdin.setRawMode(true);
                        process.stdin.resume();
                        rInstance.resume();

                        while (process.stdin.read() !== null) {
                            // flush
                        }

                        if (e.code === 'commander.helpDisplayed') {
                            setImmediate(() => rInstance.displayPrompt());
                        } else if (e.code === 'commander.unknownOption' || e.code === 'commander.unknownCommand') {
                            console.error(chalk.red(e.message));
                            setImmediate(() => rInstance.displayPrompt());
                        } else if (e.code) {
                            setImmediate(() => rInstance.displayPrompt());
                        } else {
                            console.error(chalk.red('Command execution error:'), e);
                            setImmediate(() => rInstance.displayPrompt());
                        }
                    }

                    callback(null);
                    return;
                }
            }
        } catch {
            // fall through
        }

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

    r.context.reload = async () => {
        r.context.config = await loadConfig();
        await loadLocalCommands();
        console.log(chalk.gray('Config and commands reloaded.'));
    };

    r.on('exit', () => {
        process.exit();
    });
}
