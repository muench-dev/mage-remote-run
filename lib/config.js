import fs from 'fs';
import path from 'path';
import envPaths from 'env-paths';
import { mkdirp } from 'mkdirp';
import crypto from 'crypto';

import os from 'os';

const paths = envPaths('mage-remote-run', { suffix: '' });
const CONFIG_DIR = process.platform === 'darwin'
    ? path.join(os.homedir(), '.config', 'mage-remote-run')
    : paths.config;
const CACHE_DIR = paths.cache;
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TOKEN_CACHE_FILE = path.join(CACHE_DIR, 'token-cache.json');


const OLD_CONFIG_DIR = paths.config;
const OLD_CONFIG_FILE = path.join(OLD_CONFIG_DIR, 'config.json');

async function migrateOldConfig() {
    // print platform
    if (process.platform !== 'darwin') {
        return;
    }

    if (fs.existsSync(CONFIG_FILE)) {
        return;
    }

    if (fs.existsSync(OLD_CONFIG_FILE)) {
        try {
            console.log(`Migrating config from ${OLD_CONFIG_FILE} to ${CONFIG_FILE}`);
            await mkdirp(CONFIG_DIR);
            fs.copyFileSync(OLD_CONFIG_FILE, CONFIG_FILE);
        } catch (e) {
            console.error("Error migrating config:", e.message);
        }
    }
}

function getEncryptionKey() {
    const info = os.userInfo().username + os.hostname();
    return crypto.createHash('sha256').update(info).digest();
}

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = getEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        return null;
    }
}

export async function loadConfig() {
    try {
        await migrateOldConfig();
        if (!fs.existsSync(CONFIG_FILE)) {
            return { $schema: "https://mage-remote-run.muench.dev/config.schema.json", profiles: {}, activeProfile: null, plugins: [] };
        }
        const rawData = fs.readFileSync(CONFIG_FILE, 'utf-8');
        let data = rawData;

        if (!rawData.trim().startsWith('{')) {
            const decrypted = decrypt(rawData);
            if (decrypted) {
                data = decrypted;
            }
        }

        const config = JSON.parse(data);
        if (!config.plugins) {
            config.plugins = [];
        }
        return config;
    } catch (e) {
        console.error("Error loading config:", e.message);
        return { profiles: {}, activeProfile: null };
    }
}

export async function saveConfig(config) {
    try {
        await mkdirp(CONFIG_DIR);
        const data = JSON.stringify(config, null, 2);
        const encryptedData = encrypt(data);
        fs.writeFileSync(CONFIG_FILE, encryptedData, { mode: 0o600 });
        fs.chmodSync(CONFIG_FILE, 0o600);
        if (process.env.DEBUG) {
            console.log(`Configuration saved to ${CONFIG_FILE}`);
        }
    } catch (e) {
        console.error("Error saving config:", e.message);
        throw e;
    }
}

export async function addProfile(name, settings) {
    const config = await loadConfig();
    config.profiles[name] = settings;
    // Set as active if it's the first one
    if (!config.activeProfile) {
        config.activeProfile = name;
    }
    await saveConfig(config);
}

export async function getActiveProfile() {
    const config = await loadConfig();
    if (!config.activeProfile || !config.profiles[config.activeProfile]) {
        return null;
    }
    const profile = config.profiles[config.activeProfile];
    return { ...profile, name: config.activeProfile };
}

export function getConfigPath() {
    return CONFIG_FILE;
}

export async function loadTokenCache() {
    try {
        if (!fs.existsSync(TOKEN_CACHE_FILE)) {
            return {};
        }
        const rawData = fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8');
        let data = rawData;

        if (!rawData.trim().startsWith('{')) {
            const decrypted = decrypt(rawData);
            if (decrypted) {
                data = decrypted;
            }
        }

        return JSON.parse(data);
    } catch (e) {
        console.error("Error loading token cache:", e.message);
        return {};
    }
}

export async function saveTokenCache(cache) {
    try {
        await mkdirp(CACHE_DIR);
        const data = JSON.stringify(cache, null, 2);
        const encryptedData = encrypt(data);
        fs.writeFileSync(TOKEN_CACHE_FILE, encryptedData, { mode: 0o600 });
        fs.chmodSync(TOKEN_CACHE_FILE, 0o600);
    } catch (e) {
        console.error("Error saving token cache:", e.message);
        throw e;
    }
}

export async function clearTokenCache() {
    try {
        if (fs.existsSync(TOKEN_CACHE_FILE)) {
            fs.unlinkSync(TOKEN_CACHE_FILE);
        }
    } catch (e) {
        console.error("Error clearing token cache:", e.message);
        throw e;
    }
}
