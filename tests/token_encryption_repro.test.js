import fs from 'fs';
import path from 'path';
import os from 'os';
import { jest } from '@jest/globals';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-remote-run-vulnerability-'));
const CONFIG_DIR = path.join(TEST_DIR, 'config');
const CACHE_DIR = path.join(TEST_DIR, 'cache');

jest.unstable_mockModule('env-paths', () => ({
    default: () => ({
        config: CONFIG_DIR,
        cache: CACHE_DIR
    })
}));

jest.unstable_mockModule('os', () => ({
    default: {
        ...os,
        homedir: () => TEST_DIR,
        userInfo: () => ({ username: 'testuser' }),
        hostname: () => 'testhost'
    }
}));

const { loadTokenCache, saveTokenCache, loadConfig, saveConfig } = await import('../lib/config.js');

describe('Token Encryption Verification', () => {
    afterAll(() => {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    });

    test('token cache is stored ENCRYPTED', async () => {
        const cache = { "test-token": "secret-value" };
        await saveTokenCache(cache);

        const cacheFile = path.join(CACHE_DIR, 'token-cache.json');
        const content = fs.readFileSync(cacheFile, 'utf8');

        // It is NO LONGER plaintext JSON
        expect(() => JSON.parse(content)).toThrow();
        expect(content).toContain(':'); // IV:Data format

        // But we can still load it
        const loadedCache = await loadTokenCache();
        expect(loadedCache).toEqual(cache);
    });

    test('config is stored ENCRYPTED', async () => {
        const config = { profiles: { "test": { "auth": { "clientSecret": "very-secret" } } } };
        await saveConfig(config);

        let configFile;
        if (process.platform === 'darwin') {
             configFile = path.join(TEST_DIR, '.config', 'mage-remote-run', 'config.json');
        } else {
             configFile = path.join(CONFIG_DIR, 'config.json');
        }

        const content = fs.readFileSync(configFile, 'utf8');

        // It is NO LONGER plaintext JSON
        expect(() => JSON.parse(content)).toThrow();

        // But we can still load it
        const loadedConfig = await loadConfig();
        expect(loadedConfig).toEqual(expect.objectContaining({
            profiles: config.profiles
        }));
    });

    test('can still load OLD plaintext files', async () => {
        const oldCache = { "old": "data" };
        const cacheFile = path.join(CACHE_DIR, 'token-cache.json');
        fs.mkdirSync(CACHE_DIR, { recursive: true });
        fs.writeFileSync(cacheFile, JSON.stringify(oldCache));

        const loadedCache = await loadTokenCache();
        expect(loadedCache).toEqual(oldCache);
    });
});
