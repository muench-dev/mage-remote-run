
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
        bold: { blue: (s) => s },
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
});
