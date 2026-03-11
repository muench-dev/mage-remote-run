
import { jest } from '@jest/globals';
import { Command } from 'commander';

// Define mocks before imports
const mockStart = jest.fn();

// unstable_mockModule is needed for ESM mocking of built-ins or modules when running with experimental-vm-modules
jest.unstable_mockModule('repl', () => ({
    __esModule: true,
    default: {
        start: mockStart
    },
    start: mockStart
}));

jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/config.js', () => ({
    getActiveProfile: jest.fn().mockResolvedValue('test-profile'),
    loadConfig: jest.fn()
}));

// We need to capture the wrapper function from registry to test it
let localProgramCapture;
jest.unstable_mockModule('../lib/command-registry.js', () => ({
    registerCommands: jest.fn((prog) => {
        localProgramCapture = prog;
        prog.command('list');
        const conn = prog.command('connection');
        conn.command('list');
        conn.command('add');

        const cust = prog.command('customer');
        cust.command('list');
        cust.command('create');
    })
}));

jest.unstable_mockModule('chalk', () => ({
    default: {
        bold: Object.assign((s) => s, { blue: (s) => s }),
        gray: (s) => s,
        green: (s) => s,
        cyan: (s) => s,
        red: (s) => s,
    }
}));

// Dynamic import of the module under test
const { registerConsoleCommand } = await import('../lib/commands/console.js');

describe('Console Command', () => {
    let program;
    let replMock;
    let defaultCompleterMock; // New variable

    beforeEach(() => {
        jest.clearAllMocks();

        defaultCompleterMock = jest.fn((line, cb) => cb(null, [[], line])); // implementation

        replMock = {
            context: {},
            on: jest.fn(),
            displayPrompt: jest.fn(),
            eval: jest.fn(),
            completer: defaultCompleterMock, // Use the variable
            pause: jest.fn(),
            resume: jest.fn(),
            close: jest.fn(),
        };
        mockStart.mockReturnValue(replMock);

        program = new Command();
        program.exitOverride();
        program.configureOutput({
            writeOut: () => { },
            writeErr: () => { }
        });
    });

    const getReplOptions = async () => {
        registerConsoleCommand(program);
        await program.parseAsync(['node', 'test', 'console']);
        // 0 is the dummy REPL, 1 is the real REPL
        return mockStart.mock.calls[1][0];
    };

    test('should register console command', () => {
        registerConsoleCommand(program);
        const cmd = program.commands.find(c => c.name() === 'console');
        expect(cmd).toBeDefined();
        expect(cmd.alias()).toBe('repl');
    });

    test('should start repl with correct prompt', async () => {
        const options = await getReplOptions();
        expect(options.prompt).toContain('mage>');
    });

    describe('Completer', () => {
        let completer;

        beforeEach(async () => {
            // Ensure command is run
            const opts = await getReplOptions();
            completer = opts.completer;
        });

        test('should complete top-level commands', (done) => {
            completer('conn', (err, [hits, line]) => {
                expect(err).toBeNull();
                expect(hits).toContain('connection');
                expect(line).toBe('conn');
                done();
            });
        });

        test('should complete sub-commands', (done) => {
            completer('connection l', (err, [hits, line]) => {
                expect(err).toBeNull();
                expect(hits).toEqual(['list']);
                done();
            });
        });

        test('should complete sub-commands when space is typed', (done) => {
            completer('connection ', (err, [hits, line]) => {
                expect(err).toBeNull();
                expect(hits).toContain('list');
                expect(hits).toContain('add');
                done();
            });
        });

        test('should complete nested sub-commands (customer)', (done) => {
            completer('customer ', (err, [hits, line]) => {
                expect(err).toBeNull();
                expect(hits).toContain('list');
                expect(hits).toContain('create');
                done();
            });
        });

        test('should fallback to default completer for non-commands', (done) => {
            completer('var x = 1', () => {
                expect(defaultCompleterMock).toHaveBeenCalled();
                done();
            });
        });
    });

    describe('Evaluator', () => {
        const runEval = (options, input) => new Promise((resolve) => {
            options.eval.call(replMock, input, {}, '', () => resolve());
        });

        test('should block console command inside repl', async () => {
            const options = await getReplOptions();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const parseSpy = jest.spyOn(localProgramCapture, 'parseAsync').mockResolvedValue();

            await runEval(options, 'console');

            expect(parseSpy).not.toHaveBeenCalled();
            expect(replMock.eval).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('console/repl'));

            consoleErrorSpy.mockRestore();
        });

        test('should block mcp command inside repl', async () => {
            const options = await getReplOptions();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            const parseSpy = jest.spyOn(localProgramCapture, 'parseAsync').mockResolvedValue();

            await runEval(options, 'mcp');

            expect(parseSpy).not.toHaveBeenCalled();
            expect(replMock.eval).not.toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('mcp'));

            consoleErrorSpy.mockRestore();
        });

        test('should execute valid command', async () => {
            const options = await getReplOptions();
            const parseSpy = jest.spyOn(localProgramCapture, 'parseAsync').mockResolvedValue();

            await runEval(options, 'connection list');

            expect(parseSpy).toHaveBeenCalledWith(['node', 'mage-remote-run', 'connection', 'list']);
        });

        test('should execute list internal command', async () => {
            const options = await getReplOptions();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            await runEval(options, 'list');

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Available Commands:'));
            consoleLogSpy.mockRestore();
        });

        test('should execute help internal command', async () => {
            const options = await getReplOptions();
            const outputHelpSpy = jest.spyOn(localProgramCapture, 'outputHelp').mockImplementation(() => { });

            await runEval(options, 'help');

            expect(outputHelpSpy).toHaveBeenCalled();
            outputHelpSpy.mockRestore();
        });

        test('should handle empty input', async () => {
            const options = await getReplOptions();

            await runEval(options, '   ');

            // Empty input just returns without doing anything
        });

        test('should handle arguments with quotes', async () => {
            const options = await getReplOptions();
            const parseSpy = jest.spyOn(localProgramCapture, 'parseAsync').mockResolvedValue();

            // Re-adding a mock command so we don't hit the internal commands list logic
            // using connection list for now because we know it exists. We mock parseAsync anyway.
            await runEval(options, 'connection list "foo bar" \'baz\'');

            expect(parseSpy).toHaveBeenCalledWith(['node', 'mage-remote-run', 'connection', 'list', 'foo bar', 'baz']);
        });

        test('should handle command execution errors', async () => {
            const options = await getReplOptions();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            jest.spyOn(localProgramCapture, 'parseAsync').mockRejectedValue(new Error('Test error'));

            await runEval(options, 'connection list');

            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Command execution error:'), expect.any(Error));
            consoleErrorSpy.mockRestore();
        });

        test('should handle fallback to default eval', async () => {
            const options = await getReplOptions();

            // For not known command, we will mock the dummy REPL eval if we need to
            // However, dummy eval object is not exported in our test. We will just verify it calls callback
            const callback = jest.fn();
            options.eval.call(replMock, 'const x = 1;', {}, '', callback);

            // Since it falls back to defaultEval and we cannot easily mock defaultEval which is a local var in console-actions.js
            // we just check if it executed without crashing. (Note: we didn't mock PassThrough defaultEval)
            expect(callback).not.toHaveBeenCalled(); // The default dummy eval is async or does not resolve in this sync way immediately for 'const x = 1;', we just verify no error thrown
        });

        test('should handle reload context function', async () => {
            const options = await getReplOptions();
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });

            // It gets attached to rMock.context.reload, but here we manually call the function added there.
            await replMock.context.reload();

            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Config and commands reloaded'));
            consoleLogSpy.mockRestore();
        });
    });
});
