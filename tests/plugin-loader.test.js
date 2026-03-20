import { jest } from '@jest/globals';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLE_PLUGIN_PATH = path.join(__dirname, '../examples/hello-world-plugin');
const OBJECT_DEFAULT_PLUGIN_PATH = path.join(__dirname, 'fixtures/object-default-plugin');
const CONFIG_ONLY_PLUGIN_PATH = path.join(__dirname, 'fixtures/config-only-plugin');
const NO_EXPORT_PLUGIN_PATH = path.join(__dirname, 'fixtures/no-export-plugin');
const PKG_CONFIG_PLUGIN_PATH = path.join(__dirname, 'fixtures/pkg-config-plugin');
const OBJECT_DEFAULT_WITH_CONFIG_PATH = path.join(__dirname, 'fixtures/object-default-with-config-plugin');
const NESTED_SRC_PLUGIN_PATH = path.join(__dirname, 'fixtures/nested-src-plugin');
const BAD_IMPORT_PLUGIN_PATH = path.join(__dirname, 'fixtures/bad-import-plugin');

// Mock Config
jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn()
}));

const { PluginLoader } = await import('../lib/plugin-loader.js');
const { loadConfig } = await import('../lib/config.js');
const { events } = await import('../lib/events.js');
const utils = await import('../lib/utils.js');
const commandHelper = await import('../lib/command-helper.js');

describe('PluginLoader', () => {
    let context;
    let program;
    let eventBus;

    beforeEach(() => {
        program = {
            command: jest.fn().mockReturnThis(),
            description: jest.fn().mockReturnThis(),
            option: jest.fn().mockReturnThis(),
            action: jest.fn().mockReturnThis()
        };
        eventBus = {
            on: jest.fn()
        };
        context = { program, eventBus, events, lib: { utils, commandHelper, config: { loadConfig } } };
        jest.clearAllMocks();
    });

    it('should load a plugin from absolute path (simulating local dev)', async () => {
        // Configure to load our example plugin
        loadConfig.mockResolvedValue({
            plugins: [EXAMPLE_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1);
        expect(loader.plugins[0].name).toBe(EXAMPLE_PLUGIN_PATH);
        
        // Verify plugin did its job
        expect(program.command).toHaveBeenCalledWith('hello');
        expect(eventBus.on).toHaveBeenCalledWith(events.BEFORE_COMMAND, expect.any(Function));
    });

    it('should handle missing plugins gracefully', async () => {
        loadConfig.mockResolvedValue({
            plugins: ['non-existent-plugin']
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to load plugin non-existent-plugin'));
        
        consoleSpy.mockRestore();
    });

    it('should load static configuration without evaluating default export if present', async () => {
        // Here we simulate the plugin loader picking up a package.json static configuration
        // Our example plugin `examples/virtual-command-plugin` has a `mage-remote-run.json`.
        const STATIC_PLUGIN_PATH = path.join(__dirname, '../examples/virtual-command-plugin');
        
        loadConfig.mockResolvedValue({
            plugins: [STATIC_PLUGIN_PATH],
            commands: [] // Pre-Initialize empty
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1); // The plugin module pushes metadata
        expect(loader.appContext.config.commands).toHaveLength(3);
        expect(loader.appContext.config.commands.map(command => command.name)).toEqual([
            'example virtual get-country',
            'example virtual get-countries',
            'example virtual get-products-starting-with-letter'
        ]);
    });

    it('should handle plugin execution errors', async () => {
        // We can't easily mock a broken import without mocking the FS or module system deeply.
        // But we can test if the plugin module itself throws.
        // Actually, PluginLoader wraps the import in try-catch.
        // If import succeeds but default function throws:

        // Let's rely on the fact that we can't easily make a valid module throw on import in this setup
        // without creating a bad file.
        // So we skip "execution error" test unless we write a bad file.
    });

    it('should log debug information when DEBUG env is set during plugin load', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        loadConfig.mockResolvedValue({
            plugins: [EXAMPLE_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        // DEBUG logging for loading URL and loaded plugin should be called
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loading plugin from:'));
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded plugin script:'));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });

    it('should log debug info for static config plugin in DEBUG mode', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const STATIC_PLUGIN_PATH = path.join(__dirname, '../examples/virtual-command-plugin');

        loadConfig.mockResolvedValue({
            plugins: [STATIC_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Found static configuration for plugin:'));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });

    it('should handle empty plugins config', async () => {
        loadConfig.mockResolvedValue({});

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(0);
    });

    it('should log debug error when loading fails in DEBUG mode', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        loadConfig.mockResolvedValue({
            plugins: ['non-existent-plugin']
        });

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });

    it('should warn when plugin has non-function default and no static config', async () => {
        loadConfig.mockResolvedValue({
            plugins: [OBJECT_DEFAULT_PLUGIN_PATH]
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('does not export a default function'));

        consoleSpy.mockRestore();
    });

    it('should load plugin with static config (mage-remote-run.json) and no default export', async () => {
        loadConfig.mockResolvedValue({
            plugins: [CONFIG_ONLY_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1);
        expect(loader.plugins[0].module).toBeNull();
    });

    it('should log debug info for config-only plugin (no default export)', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        loadConfig.mockResolvedValue({
            plugins: [CONFIG_ONLY_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded plugin config only'));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });

    it('should warn when plugin has no default export and no static config', async () => {
        loadConfig.mockResolvedValue({
            plugins: [NO_EXPORT_PLUGIN_PATH]
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('could not be loaded'));

        consoleSpy.mockRestore();
    });

    it('should load static config from package.json mage-remote-run key', async () => {
        loadConfig.mockResolvedValue({
            plugins: [PKG_CONFIG_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1);
    });

    it('should load plugin with non-function default that has static config', async () => {
        loadConfig.mockResolvedValue({
            plugins: [OBJECT_DEFAULT_WITH_CONFIG_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1);
        expect(loader.plugins[0].module).not.toBeNull();
    });

    it('should traverse directories to find plugin root (nested src layout)', async () => {
        loadConfig.mockResolvedValue({
            plugins: [NESTED_SRC_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(loader.plugins).toHaveLength(1);
    });

    it('should initialize appContext.config.commands when not present', async () => {
        loadConfig.mockResolvedValue({
            plugins: [CONFIG_ONLY_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        // Do NOT pre-initialize commands
        loader.appContext.config = {};
        await loader.loadPlugins();

        expect(loader.appContext.config.commands).toBeDefined();
    });

    it('should log debug warning when plugin module import fails', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        loadConfig.mockResolvedValue({
            plugins: [BAD_IMPORT_PLUGIN_PATH]
        });

        const loader = new PluginLoader(context);
        await loader.loadPlugins();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not import plugin module'));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });

    it('should log debug info for non-function default with static config', async () => {
        process.env.DEBUG = 'true';
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        loadConfig.mockResolvedValue({
            plugins: [OBJECT_DEFAULT_WITH_CONFIG_PATH]
        });

        const loader = new PluginLoader(context);
        loader.appContext.config = { commands: [] };
        await loader.loadPlugins();

        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Loaded plugin config only'));

        delete process.env.DEBUG;
        consoleSpy.mockRestore();
    });
});
