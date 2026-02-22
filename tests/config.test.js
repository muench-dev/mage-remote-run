import { jest } from '@jest/globals';
import path from 'path';

// Helper to verify path handling
const isDarwin = process.platform === 'darwin';

// Define mock paths relative to current working directory to be safe
const MOCK_HOME = path.resolve(process.cwd(), 'mock-home');
const MOCK_CONFIG = path.resolve(process.cwd(), 'mock-config');
const MOCK_CACHE = path.resolve(process.cwd(), 'mock-cache');

const EXPECTED_CONFIG_DIR = isDarwin ? path.join(MOCK_HOME, '.config', 'mage-remote-run') : MOCK_CONFIG;
const EXPECTED_CONFIG_FILE = path.join(EXPECTED_CONFIG_DIR, 'config.json');
const EXPECTED_CACHE_DIR = MOCK_CACHE;
const EXPECTED_TOKEN_CACHE_FILE = path.join(EXPECTED_CACHE_DIR, 'token-cache.json');

// Define mocks
jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        copyFileSync: jest.fn(),
        chmodSync: jest.fn(),
        unlinkSync: jest.fn()
    }
}));

jest.unstable_mockModule('mkdirp', () => ({
    mkdirp: jest.fn()
}));

jest.unstable_mockModule('env-paths', () => ({
    default: jest.fn(() => ({ config: MOCK_CONFIG, cache: MOCK_CACHE }))
}));

jest.unstable_mockModule('os', () => ({
    default: {
        homedir: jest.fn(() => MOCK_HOME)
    }
}));

// Import module under test
const configMod = await import('../lib/config.js');
const fs = (await import('fs')).default;
const { mkdirp } = await import('mkdirp');

describe('Config Management', () => {
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeEach(() => {
        jest.clearAllMocks();
        mkdirp.mockResolvedValue(undefined);
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('loadConfig', () => {
        it('should return default config if file does not exist', async () => {
            fs.existsSync.mockReturnValue(false);

            const config = await configMod.loadConfig();

            expect(config).toEqual({ profiles: {}, activeProfile: null, plugins: [] });
            expect(fs.existsSync).toHaveBeenCalledWith(EXPECTED_CONFIG_FILE);
        });

        it('should load and parse config file', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: { test: {} },
                activeProfile: 'test'
            }));

            const config = await configMod.loadConfig();

            expect(config).toEqual({
                profiles: { test: {} },
                activeProfile: 'test',
                plugins: []
            });
            expect(fs.readFileSync).toHaveBeenCalledWith(EXPECTED_CONFIG_FILE, 'utf-8');
        });

        it('should handle JSON parse errors', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('invalid json');

            const config = await configMod.loadConfig();

            expect(config).toEqual({ profiles: {}, activeProfile: null });
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading config'), expect.anything());
        });

        it('should ensure plugins array exists', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: {}
            }));

            const config = await configMod.loadConfig();

            expect(config.plugins).toEqual([]);
        });
    });

    describe('saveConfig', () => {
        it('should save config to file with correct permissions', async () => {
            const config = { profiles: { test: {} }, activeProfile: 'test', plugins: [] };

            await configMod.saveConfig(config);

            expect(mkdirp).toHaveBeenCalledWith(EXPECTED_CONFIG_DIR);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                EXPECTED_CONFIG_FILE,
                JSON.stringify(config, null, 2),
                { mode: 0o600 }
            );
            expect(fs.chmodSync).toHaveBeenCalledWith(EXPECTED_CONFIG_FILE, 0o600);
        });

        it('should log debug message if DEBUG env var is set', async () => {
            const originalDebug = process.env.DEBUG;
            process.env.DEBUG = 'true';

            try {
                const config = { profiles: {} };
                await configMod.saveConfig(config);
                expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration saved'));
            } finally {
                if (originalDebug === undefined) {
                    delete process.env.DEBUG;
                } else {
                    process.env.DEBUG = originalDebug;
                }
            }
        });

        it('should handle errors during save', async () => {
            const error = new Error('Write failed');
            mkdirp.mockRejectedValueOnce(error);

            await expect(configMod.saveConfig({})).rejects.toThrow('Write failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving config'), 'Write failed');
        });
    });

    describe('addProfile', () => {
        it('should add profile and set as active if first profile', async () => {
            // Mock loadConfig to return empty
            fs.existsSync.mockReturnValue(false);

            await configMod.addProfile('NewProfile', { url: 'http://test.com' });

            // Verify saveConfig was called with correct data
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                EXPECTED_CONFIG_FILE,
                expect.stringContaining('"NewProfile":'),
                expect.anything()
            );

            // Verify activeProfile was set
            const saveCall = fs.writeFileSync.mock.calls[0];
            const savedConfig = JSON.parse(saveCall[1]);
            expect(savedConfig.activeProfile).toBe('NewProfile');
            expect(savedConfig.profiles['NewProfile']).toEqual({ url: 'http://test.com' });
        });

        it('should add profile but NOT change active if one exists', async () => {
            // Mock loadConfig to return existing profile
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: { 'Existing': {} },
                activeProfile: 'Existing',
                plugins: []
            }));

            await configMod.addProfile('NewProfile', { url: 'http://test.com' });

            const saveCall = fs.writeFileSync.mock.calls[0];
            const savedConfig = JSON.parse(saveCall[1]);
            expect(savedConfig.activeProfile).toBe('Existing');
            expect(savedConfig.profiles['NewProfile']).toEqual({ url: 'http://test.com' });
        });
    });

    describe('getActiveProfile', () => {
        it('should return active profile with name', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: { 'MyProfile': { type: 'saas' } },
                activeProfile: 'MyProfile'
            }));

            const profile = await configMod.getActiveProfile();

            expect(profile).toEqual({ type: 'saas', name: 'MyProfile' });
        });

        it('should return null if no active profile set', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: { 'MyProfile': {} },
                activeProfile: null
            }));

            const profile = await configMod.getActiveProfile();

            expect(profile).toBeNull();
        });

        it('should return null if active profile does not exist in profiles', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({
                profiles: { 'Other': {} },
                activeProfile: 'Missing'
            }));

            const profile = await configMod.getActiveProfile();

            expect(profile).toBeNull();
        });
    });

    describe('getConfigPath', () => {
        it('should return config file path', () => {
            expect(configMod.getConfigPath()).toBe(EXPECTED_CONFIG_FILE);
        });
    });

    describe('Token Cache', () => {
        it('should load token cache', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(JSON.stringify({ token: 'abc' }));

            const cache = await configMod.loadTokenCache();

            expect(cache).toEqual({ token: 'abc' });
            expect(fs.readFileSync).toHaveBeenCalledWith(EXPECTED_TOKEN_CACHE_FILE, 'utf-8');
        });

        it('should return empty object if token cache missing', async () => {
            fs.existsSync.mockReturnValue(false);

            const cache = await configMod.loadTokenCache();

            expect(cache).toEqual({});
        });

        it('should handle errors loading token cache', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('invalid json');

            const cache = await configMod.loadTokenCache();

            expect(cache).toEqual({});
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error loading token cache'), expect.anything());
        });

        it('should save token cache', async () => {
            const cache = { token: 'abc' };
            await configMod.saveTokenCache(cache);

            expect(mkdirp).toHaveBeenCalledWith(EXPECTED_CACHE_DIR);
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                EXPECTED_TOKEN_CACHE_FILE,
                JSON.stringify(cache, null, 2),
                { mode: 0o600 }
            );
            expect(fs.chmodSync).toHaveBeenCalledWith(EXPECTED_TOKEN_CACHE_FILE, 0o600);
        });

        it('should handle errors saving token cache', async () => {
            const error = new Error('Write failed');
            mkdirp.mockRejectedValueOnce(error);

            await expect(configMod.saveTokenCache({})).rejects.toThrow('Write failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving token cache'), 'Write failed');
        });

        it('should clear token cache', async () => {
            fs.existsSync.mockReturnValue(true);

            await configMod.clearTokenCache();

            expect(fs.unlinkSync).toHaveBeenCalledWith(EXPECTED_TOKEN_CACHE_FILE);
        });

        it('should do nothing if token cache to clear does not exist', async () => {
            fs.existsSync.mockReturnValue(false);

            await configMod.clearTokenCache();

            expect(fs.unlinkSync).not.toHaveBeenCalled();
        });

        it('should handle errors clearing token cache', async () => {
            fs.existsSync.mockReturnValue(true);
            fs.unlinkSync.mockImplementation(() => { throw new Error('Unlink failed'); });

            await expect(configMod.clearTokenCache()).rejects.toThrow('Unlink failed');
            expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error clearing token cache'), 'Unlink failed');
        });
    });
});
