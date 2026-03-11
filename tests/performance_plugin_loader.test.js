import { jest } from '@jest/globals';

// Mock global-dirs
jest.unstable_mockModule('global-dirs', () => ({
    default: {
        npm: { packages: '/mock/npm/node_modules' },
        yarn: { packages: '/mock/yarn/node_modules' }
    }
}));

// Mock fs
jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        promises: {
            access: jest.fn(),
            readFile: jest.fn()
        }
    },
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    promises: {
        access: jest.fn(),
        readFile: jest.fn()
    }
}));

// Mock config
jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn()
}));

// Mock pathToFileURL to return something we can handle
jest.unstable_mockModule('url', () => ({
    pathToFileURL: (p) => ({ href: `file://${p}` }),
    fileURLToPath: (u) => u.replace('file://', '')
}));

// We need to mock 'module' for createRequire if we want to control require.resolve
// But maybe we can just let it fail.

const { PluginLoader } = await import('../lib/plugin-loader.js');
const fs = (await import('fs')).default;
const { loadConfig } = await import('../lib/config.js');

describe('PluginLoader Performance', () => {
    let context;
    let consoleErrorSpy;
    let consoleWarnSpy;

    beforeEach(() => {
        context = {
            program: { command: jest.fn().mockReturnThis(), description: jest.fn().mockReturnThis(), option: jest.fn().mockReturnThis(), action: jest.fn().mockReturnThis() },
            eventBus: { on: jest.fn() },
            events: {}
        };
        jest.clearAllMocks();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });

    it('benchmarks global plugin resolution', async () => {
        const PLUGIN_COUNT = 100;
        const plugins = Array.from({ length: PLUGIN_COUNT }, (_, i) => `global-plugin-${i}`);

        loadConfig.mockResolvedValue({ plugins });

        // Simulate that local resolve fails
        // We can't easily mock 'require' inside PluginLoader because it's created via createRequire(import.meta.url)
        // But we can hope it fails for our mock names.

        // Setup fs mocks to simulate global yarn plugins
        fs.promises.access.mockImplementation((p) => {
            if (p.endsWith('mage-remote-run.json')) return Promise.reject(new Error('ENOENT'));
            if (p.includes('/mock/npm/node_modules')) return Promise.reject(new Error('ENOENT'));
            if (p.includes('/mock/yarn/node_modules')) return Promise.resolve();
            return Promise.reject(new Error('ENOENT'));
        });

        fs.promises.readFile.mockImplementation((p) => {
            if (p.endsWith('package.json')) {
                return Promise.resolve(JSON.stringify({ main: 'index.js' }));
            }
            return Promise.resolve('');
        });

        // We need to mock the dynamic import. This is the hard part in Jest ESM.
        // Actually, we can just let it fail and catch the error in loadPlugins,
        // as long as we measure the time.
        // But loadPlugins catches errors and logs them.

        const start = Date.now();
        const loader = new PluginLoader(context);
        await loader.loadPlugins();
        const duration = Date.now() - start;

        process.stderr.write(`\nBENCHMARK_RESULT: ${duration}ms for ${PLUGIN_COUNT} plugins\n`);
    });
});
