import fs from 'fs';
import path from 'path';
import os from 'os';
import { jest } from '@jest/globals';

const TEST_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mage-remote-run-test-'));
const CONFIG_DIR = path.join(TEST_DIR, 'config');
const CACHE_DIR = path.join(TEST_DIR, 'cache');

// Mock env-paths to control where files are written
jest.unstable_mockModule('env-paths', () => ({
    default: () => ({
        config: CONFIG_DIR,
        cache: CACHE_DIR
    })
}));

// Mock os.homedir just in case (though on Linux it might use env-paths directly)
const actualOs = await import('os'); // dynamic import of actual module inside test file scope to use in factory? No wait.
// Jest factory must be synchronous or use top-level await if module is ESM.

jest.unstable_mockModule('os', () => ({
    default: {
        ...os, // spread the actual os module imported above
        homedir: () => TEST_DIR
    }
}));


// Import the module under test AFTER mocking
const { saveConfig, saveTokenCache } = await import('../lib/config.js');

describe('Security: File Permissions', () => {
    afterAll(() => {
        try {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        } catch (e) {
            console.error('Failed to cleanup test dir:', e);
        }
    });

    test('config file should have secure permissions (600)', async () => {
        const config = { test: true };
        await saveConfig(config);

        // config.js logic:
        // const CONFIG_DIR = process.platform === 'darwin' ? path.join(os.homedir(), '.config', 'mage-remote-run') : paths.config;

        let expectedFile;
        if (process.platform === 'darwin') {
             expectedFile = path.join(TEST_DIR, '.config', 'mage-remote-run', 'config.json');
        } else {
             expectedFile = path.join(CONFIG_DIR, 'config.json');
        }

        if (!fs.existsSync(expectedFile)) {
             // Debug info
             console.log('Files in TEST_DIR:', fs.readdirSync(TEST_DIR, {recursive: true}));
             throw new Error(`Config file not found at ${expectedFile}`);
        }

        const stats = fs.statSync(expectedFile);
        const mode = stats.mode & 0o777;

        // We expect this to FAIL initially (likely 644 or 664 or 666 depending on umask)
        // But for the reproduction test, we want to ASSERT that it fails if we are reproducing,
        // OR we write the test to expect 600 and see it fail.
        // I'll write it to expect 600.
        expect(mode).toBe(0o600);
    });

    test('should update permissions of existing insecure config file', async () => {
        const config = { test: true };

        // Create insecure file first
        let expectedFile;
        if (process.platform === 'darwin') {
             expectedFile = path.join(TEST_DIR, '.config', 'mage-remote-run', 'config.json');
        } else {
             expectedFile = path.join(CONFIG_DIR, 'config.json');
        }

        fs.mkdirSync(path.dirname(expectedFile), { recursive: true });
        fs.writeFileSync(expectedFile, '{}', { mode: 0o666 });

        // Verify it is insecure
        const initialStats = fs.statSync(expectedFile);
        if ((initialStats.mode & 0o777) === 0o600) {
            // If by chance umask makes it 600, force it to 666
             fs.chmodSync(expectedFile, 0o666);
        }

        await saveConfig(config);

        const stats = fs.statSync(expectedFile);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
    });

    test('token cache file should have secure permissions (600)', async () => {
        const cache = { token: '123' };
        await saveTokenCache(cache);

        const expectedFile = path.join(CACHE_DIR, 'token-cache.json');

        if (!fs.existsSync(expectedFile)) {
             throw new Error(`Token cache file not found at ${expectedFile}`);
        }

        const stats = fs.statSync(expectedFile);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600);
    });
});
