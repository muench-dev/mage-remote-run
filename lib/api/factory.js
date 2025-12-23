import { SaasClient } from './saas.js';
import { PaasClient } from './paas.js';
import { getActiveProfile } from '../config.js';

export async function createClient(configOrProfileName = null) {
    let settings;
    if (typeof configOrProfileName === 'object' && configOrProfileName !== null) {
        settings = configOrProfileName;
    } else if (typeof configOrProfileName === 'string') {
        const { loadConfig } = await import('../config.js');
        const config = await loadConfig();
        settings = config.profiles[configOrProfileName];
    } else {
        settings = await getActiveProfile();
    }

    if (!settings) {
        throw new Error("No active profile found. Please run 'mage-remote-run configure'.");
    }

    if (settings.type === 'ac-saas' || settings.type === 'saas') {
        return new SaasClient(settings);
    } else {
        // magento-os, mage-os, ac-on-prem, ac-cloud-paas, paas
        return new PaasClient(settings);
    }
}
