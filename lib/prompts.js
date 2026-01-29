import { input, select, password, confirm } from '@inquirer/prompts';

export async function askForProfileSettings(defaults = {}) {
    const type = await select({
        message: 'System Type:',
        default: defaults.type,
        choices: [
            { name: 'Magento Open Source (On-Premises)', value: 'magento-os' },
            { name: 'Mage-OS (On-Premises)', value: 'mage-os' },
            { name: 'Adobe Commerce (On-Premises)', value: 'ac-on-prem' },
            { name: 'Adobe Commerce Cloud (PaaS)', value: 'ac-cloud-paas' },
            { name: 'Adobe Commerce as a Cloud Service (SaaS)', value: 'ac-saas' }
        ]
    });

    const url = await input({
        message: 'Instance URL (e.g., https://magento.test):',
        default: defaults.url,
        validate: value => value ? true : 'URL is required'
    });

    let authConfig = {};

    if (type === 'ac-saas') {
        const clientId = await input({
            message: 'Client ID:',
            default: defaults.auth?.clientId,
            validate: value => value ? true : 'Client ID is required'
        });

        const clientSecret = await password({
            message: 'Client Secret:',
            description: defaults.auth?.clientSecret ? '(Leave empty to keep current)' : undefined,
            validate: value => (value || defaults.auth?.clientSecret) ? true : 'Client Secret is required'
        });

        // If user entered nothing but we have default, use default.
        // Inquirer password prompt with default returns default if empty.
        // We just need to make sure we don't return empty string if default missed.
        // Actually, inquirer returns default.

        authConfig = { clientId, clientSecret: clientSecret || defaults.auth?.clientSecret };
    } else {
        const method = await select({
            message: 'Authentication Method:',
            default: defaults.auth?.method,
            choices: [
                { name: 'Bearer Token', value: 'bearer' },
                { name: 'OAuth 1.0a', value: 'oauth1' }
            ]
        });

        if (method === 'bearer') {
            const token = await password({
                message: 'Access Token:',
                description: defaults.auth?.token ? '(Leave empty to keep current)' : undefined,
                validate: value => (value || defaults.auth?.token) ? true : 'Token is required'
            });
            authConfig = { method: 'bearer', token: token || defaults.auth?.token };
        } else {
            const consumerKey = await input({
                message: 'Consumer Key:',
                default: defaults.auth?.consumerKey
            });

            const consumerSecret = await password({
                message: 'Consumer Secret:',
                description: defaults.auth?.consumerSecret ? '(Leave empty to keep current)' : undefined,
                validate: value => (value || defaults.auth?.consumerSecret) ? true : 'Consumer Secret is required'
            });

            const accessToken = await password({
                message: 'Access Token:',
                description: defaults.auth?.accessToken ? '(Leave empty to keep current)' : undefined,
                validate: value => (value || defaults.auth?.accessToken) ? true : 'Access Token is required'
            });

            const tokenSecret = await password({
                message: 'Token Secret:',
                description: defaults.auth?.tokenSecret ? '(Leave empty to keep current)' : undefined,
                validate: value => (value || defaults.auth?.tokenSecret) ? true : 'Token Secret is required'
            });

            const signatureMethod = await select({
                message: 'Signature Method:',
                default: defaults.auth?.signatureMethod || 'hmac-sha256',
                choices: [
                    { name: 'HMAC-SHA256 (Default, Newer Versions)', value: 'hmac-sha256' },
                    { name: 'HMAC-SHA1 (Older Versions)', value: 'hmac-sha1' }
                ]
            });

            authConfig = {
                method: 'oauth1',
                consumerKey,
                consumerSecret: consumerSecret || defaults.auth?.consumerSecret,
                accessToken: accessToken || defaults.auth?.accessToken,
                tokenSecret: tokenSecret || defaults.auth?.tokenSecret,
                signatureMethod
            };
        }
    }

    return {
        type,
        url,
        auth: authConfig
    };
}
