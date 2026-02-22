import { startConsoleAction } from './console-actions.js';

export function registerConsoleCommand(program) {
    program
        .command('console')
        .alias('repl')
        .description('Start an interactive console')
        .option('-d, --debug', 'Enable debug output')
        .action(startConsoleAction);
}
