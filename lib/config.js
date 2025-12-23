import fs from 'fs';
import path from 'path';
import envPaths from 'env-paths';
import { mkdirp } from 'mkdirp';

const paths = envPaths('mage-remote-run', { suffix: '' });
const CONFIG_DIR = paths.config;
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export async function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return { profiles: {}, activeProfile: null };
        }
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Error loading config:", e.message);
        return { profiles: {}, activeProfile: null };
    }
}

export async function saveConfig(config) {
    try {
        await mkdirp(CONFIG_DIR);
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        console.log(`Configuration saved to ${CONFIG_FILE}`);
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
    return config.profiles[config.activeProfile];
}

export function getConfigPath() {
    return CONFIG_FILE;
}
