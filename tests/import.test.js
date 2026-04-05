
import { jest } from '@jest/globals';
import { Command } from 'commander';

// Mocks
// Mocks
jest.unstable_mockModule('../lib/api/factory.js', () => ({
    createClient: jest.fn()
}));

jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn()
}));

import os from 'os';

// Mock FS - Define BEFORE utils because utils usage depends on fs
jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn().mockImplementation((path) => {
            // Native fs doesn't support ~, so mock should reject it if not expanded
            if (path.startsWith('~')) return false;
            return true;
        }),
        readFileSync: jest.fn().mockImplementation((path) => {
            // Return special content for home dir file
            if (path.includes(os.homedir())) return '{"home": "sweet_home"}';
            if (path && path.endsWith('.json')) return '{"foo": "bar"}';
            if (path && path.endsWith('.csv')) return 'col1,col2\nval1,val2';
            return '';
        })
    }
}));

jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn().mockResolvedValue('mock_value'),
    select: jest.fn().mockResolvedValue('append'),
    confirm: jest.fn().mockResolvedValue(true),
    editor: jest.fn().mockResolvedValue('mock_editor_content')
}));

jest.unstable_mockModule('@inquirer/search', () => ({
    default: jest.fn().mockResolvedValue('mock_value')
}));



const factoryMod = await import('../lib/api/factory.js');
const configMod = await import('../lib/config.js');
const { registerImportCommands } = await import('../lib/commands/import.js');

describe('Import Commands', () => {
    let program;
    let consoleLogSpy;
    let mockClient;

    beforeEach(() => {
        program = new Command();
        // Commander exits by default on error, override it
        program.exitOverride();

        // Default profile for registration in tests (override per test if needed)
        registerImportCommands(program, { type: 'ac-cloud-paas' });

        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });

        mockClient = {
            post: jest.fn().mockResolvedValue({ success: true })
        };
        factoryMod.createClient.mockResolvedValue(mockClient);

        jest.clearAllMocks();

        // Mock TTY to prevent readInput from waiting on stdin
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    });

    afterEach(() => {
        // Restore TTY ?? (Actually undefined is usually default in test, but strict restore is good)
        Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true });
        jest.restoreAllMocks();
    });

    test('import json: success on PaaS (Default Options)', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        // Mock sequence:
        // 1. Search (Entity) -> 'catalog_product'
        // 2. Select (Behavior) -> 'append'
        // 3. Select (Validation Strategy) -> 'validation-stop-on-errors'
        // 4. Input (Allowed Error Count) -> '10'

        search.mockResolvedValueOnce('catalog_product');
        inquirer.select
            .mockResolvedValueOnce('append')
            .mockResolvedValueOnce('validation-stop-on-errors');
        inquirer.input.mockResolvedValueOnce('10');

        await program.parseAsync(['node', 'test', 'import', 'json', 'test.json']);

        expect(factoryMod.createClient).toHaveBeenCalled();
        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/json',
            expect.objectContaining({
                source: expect.objectContaining({
                    entity: 'catalog_product',
                    behavior: 'append',
                    validation_strategy: 'validation-stop-on-errors',
                    allowed_error_count: 10,
                    items: [{ foo: 'bar' }]
                })
            })
        );
    });

    test('import json: resolves tilde in path', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        // We expect readInput to transform '~/test.json' -> '/mock/home/test.json'
        // And then fs.readFileSync to return '{"home": "sweet_home"}'

        await program.parseAsync([
            'node', 'test', 'import', 'json', '~/test.json',
            '--entity-type', 'catalog_product',
            '--behavior', 'append',
            '--validation-strategy', 'validation-skip-errors',
            '--allowed-error-count', '10'
        ]);

        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/json',
            expect.objectContaining({
                source: expect.objectContaining({
                    items: [{ "home": "sweet_home" }]
                })
            })
        );
    });

    test('import json: success with full CLI options (No Interaction)', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        // No mocks needed for inquirer if logic works correctly (skipping prompts)
        // But we keep them just in case logic fails, tests would timeout or fail on call count

        await program.parseAsync([
            'node', 'test', 'import', 'json', 'test.json',
            '--entity-type', 'customer',
            '--behavior', 'replace',
            '--validation-strategy', 'validation-skip-errors',
            '--allowed-error-count', '999'
        ]);

        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/json',
            expect.objectContaining({
                source: expect.objectContaining({
                    entity: 'customer',
                    behavior: 'replace',
                    validation_strategy: 'validation-skip-errors',
                    allowed_error_count: 999
                })
            })
        );
    });

    test('import json: success with partial CLI options', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        search.mockResolvedValueOnce('catalog_product');
        inquirer.select.mockResolvedValueOnce('append'); // Behavior only, validation prompt skipped due to flags

        await program.parseAsync([
            'node', 'test', 'import', 'json', 'test.json',
            '--validation-strategy', 'validation-skip-errors',
            '--allowed-error-count', '999'
        ]);

        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/json',
            expect.objectContaining({
                source: expect.objectContaining({
                    validation_strategy: 'validation-skip-errors',
                    allowed_error_count: 999
                })
            })
        );
    });

    test('import csv: success on PaaS (CLI Options)', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        search.mockResolvedValueOnce('catalog_product');
        inquirer.select.mockResolvedValueOnce('append'); // Behavior only

        // Validation options are provided via flags implicitly or default prompt logic (here flags for parsing options)
        // Adding validation flags too to skip prompts
        await program.parseAsync([
            'node', 'test', 'import', 'csv', 'test.csv',
            '--field-separator', ';',
            '--multi-value-separator', '|',
            '--empty-value-constant', 'NULL',
            '--images-file-dir', 'pub/media/import',
            '--validation-strategy', 'validation-skip-errors',
            '--allowed-error-count', '5'
        ]);

        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/csv',
            expect.objectContaining({
                source: expect.objectContaining({
                    csv_data: Buffer.from('col1,col2\nval1,val2').toString('base64'),
                    import_field_separator: ';',
                    import_multiple_value_separator: '|',
                    import_empty_attribute_value_constant: 'NULL',
                    import_images_file_dir: 'pub/media/import',
                    validation_strategy: 'validation-skip-errors',
                    allowed_error_count: 5
                })
            })
        );
    });

    test('import json: use editor input', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-saas' }
            }
        });

        // Mock confirm to false (no file) -> triggers editor
        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        search.mockResolvedValueOnce('catalog_product');
        inquirer.confirm.mockResolvedValueOnce(false);
        inquirer.editor.mockResolvedValueOnce(JSON.stringify([{ "editor": "data" }]));
        inquirer.select
            .mockResolvedValueOnce('append')
            .mockResolvedValueOnce('validation-stop-on-errors');
        inquirer.input.mockResolvedValueOnce('10');


        await program.parseAsync(['node', 'test', 'import', 'json']);

        expect(inquirer.editor).toHaveBeenCalled();
        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/json',
            expect.objectContaining({
                source: expect.objectContaining({
                    items: [{ "editor": "data" }]
                })
            })
        );
    });

    test('import csv: use editor input', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-cloud-paas' }
            }
        });

        // Mock confirm to false (no file) -> triggers editor
        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        search.mockResolvedValueOnce('catalog_product');
        inquirer.confirm.mockResolvedValueOnce(false);
        inquirer.editor.mockResolvedValueOnce('col1,col2\nval1,val2');
        inquirer.select
            .mockResolvedValueOnce('append')
            .mockResolvedValueOnce('validation-stop-on-errors');
        inquirer.input.mockResolvedValueOnce('10');

        await program.parseAsync(['node', 'test', 'import', 'csv']);

        expect(inquirer.editor).toHaveBeenCalled();
        expect(mockClient.post).toHaveBeenCalledWith(
            'V1/import/csv',
            expect.objectContaining({
                source: expect.objectContaining({
                    csv_data: Buffer.from('col1,col2\nval1,val2').toString('base64')
                })
            })
        );
    });

    test('import csv: failure on SaaS', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'ac-saas' }
            }
        });

        // Current handleError logs but does not throw. Parse completes.
        await program.parseAsync(['node', 'test', 'import', 'csv', 'test.csv']);

        expect(mockClient.post).not.toHaveBeenCalled();
        // Check that console.error was called with expected message part
        // We spied on console.error. Check if any call contains message.
        // The message is "Error: This command is only available for Adobe Commerce (Cloud/On-Premise)."
        // but handleError formats it.
        // It calls console.error('Error:', message) or just console.error(error) if debug?
        // handleError: console.error(chalk.red('Error:'), message);
        expect(console.error).toHaveBeenCalled();
    });

    test('import json: failure on invalid type', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: {
                'test': { type: 'magento-os' }
            }
        });

        await program.parseAsync(['node', 'test', 'import', 'json', 'test.json']);

        expect(console.error).toHaveBeenCalled();
    });

    test('import prompt validator handles tilde', async () => {
        configMod.loadConfig.mockResolvedValue({
            activeProfile: 'test',
            profiles: { 'test': { type: 'ac-cloud-paas' } }
        });
        const inquirer = await import('@inquirer/prompts');
        const search = (await import('@inquirer/search')).default;

        // Setup interaction flow to reach file prompt
        search.mockResolvedValueOnce('catalog_product');
        inquirer.confirm.mockResolvedValueOnce(true); // "Do you want to import a file?" -> Yes
        inquirer.input.mockResolvedValueOnce('~/test.json'); // Return tilde path to code
        // Subsequent prompts don't matter much as we check validator
        inquirer.select.mockResolvedValue('append');
        inquirer.input.mockResolvedValue('10');

        await program.parseAsync(['node', 'test', 'import', 'json']);

        // Find the input call for file path
        // It provides 'message: Path to JSON file:'
        const call = inquirer.input.mock.calls.find(c => c[0] && c[0].message && c[0].message.includes('Path to JSON file'));
        expect(call).toBeDefined();

        const validate = call[0].validate;

        // Validation should Pass for '~/test.json' because code expands it to '/User/home/test.json' (which mock FS accepts)
        // If it didn't expand, mock FS returns false for '~/test.json'
        expect(validate('~/test.json')).toBe(true);

        // Verify invalid path
        // fs mock returns true basically always unless it starts with ~, so we can't test "File not found" easily unless we spy FS.
        // But the pass case proves expansion happened.
    });
});
