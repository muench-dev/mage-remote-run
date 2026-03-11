import { jest } from '@jest/globals';

jest.unstable_mockModule('@inquirer/prompts', () => ({
    input: jest.fn(),
    select: jest.fn(),
    password: jest.fn()
}));

const { askForProfileSettings } = await import('../lib/prompts.js');
const { input, select, password } = await import('@inquirer/prompts');

describe('askForProfileSettings', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should prompt and return config for ac-saas without defaults', async () => {
        select.mockResolvedValueOnce('ac-saas'); // type
        input.mockResolvedValueOnce('https://saas.test'); // url
        input.mockResolvedValueOnce('client-id'); // clientId
        password.mockResolvedValueOnce('client-secret'); // clientSecret

        const result = await askForProfileSettings();
        expect(result).toEqual({
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: {
                clientId: 'client-id',
                clientSecret: 'client-secret'
            }
        });

        // Validate functions
        const urlValidate = input.mock.calls[0][0].validate;
        expect(urlValidate('http://foo')).toBe(true);
        expect(urlValidate('')).toBe('URL is required');

        const clientIdValidate = input.mock.calls[1][0].validate;
        expect(clientIdValidate('id')).toBe(true);
        expect(clientIdValidate('')).toBe('Client ID is required');

        const clientSecretValidate = password.mock.calls[0][0].validate;
        expect(clientSecretValidate('secret')).toBe(true);
        expect(clientSecretValidate('')).toBe('Client Secret is required');
    });

    test('should prompt and return config for ac-saas with defaults', async () => {
        select.mockResolvedValueOnce('ac-saas'); // type
        input.mockResolvedValueOnce('https://saas.test'); // url
        input.mockResolvedValueOnce('client-id'); // clientId
        password.mockResolvedValueOnce(''); // clientSecret (using default)

        const defaults = {
            type: 'ac-saas',
            url: 'https://saas.default',
            auth: {
                clientId: 'default-id',
                clientSecret: 'default-secret'
            }
        };

        const result = await askForProfileSettings(defaults);
        expect(result).toEqual({
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: {
                clientId: 'client-id',
                clientSecret: 'default-secret'
            }
        });

        const clientSecretValidate = password.mock.calls[0][0].validate;
        expect(clientSecretValidate('')).toBe(true); // Should pass because default exists
    });

    test('should prompt and return config for bearer token without defaults', async () => {
        select.mockResolvedValueOnce('magento-os'); // type
        input.mockResolvedValueOnce('https://paas.test'); // url
        select.mockResolvedValueOnce('bearer'); // method
        password.mockResolvedValueOnce('my-token'); // token

        const result = await askForProfileSettings();
        expect(result).toEqual({
            type: 'magento-os',
            url: 'https://paas.test',
            auth: {
                method: 'bearer',
                token: 'my-token'
            }
        });

        const tokenValidate = password.mock.calls[0][0].validate;
        expect(tokenValidate('token')).toBe(true);
        expect(tokenValidate('')).toBe('Token is required');
    });

    test('should prompt and return config for bearer token with defaults', async () => {
        select.mockResolvedValueOnce('magento-os'); // type
        input.mockResolvedValueOnce('https://paas.test'); // url
        select.mockResolvedValueOnce('bearer'); // method
        password.mockResolvedValueOnce(''); // token (using default)

        const defaults = {
            auth: {
                token: 'default-token'
            }
        };

        const result = await askForProfileSettings(defaults);
        expect(result.auth.token).toBe('default-token');

        const tokenValidate = password.mock.calls[0][0].validate;
        expect(tokenValidate('')).toBe(true); // Should pass because default exists
    });

    test('should prompt and return config for oauth1 without defaults', async () => {
        select.mockResolvedValueOnce('magento-os'); // type
        input.mockResolvedValueOnce('https://paas.test'); // url
        select.mockResolvedValueOnce('oauth1'); // method
        input.mockResolvedValueOnce('consumer-key'); // consumerKey
        password.mockResolvedValueOnce('consumer-secret'); // consumerSecret
        password.mockResolvedValueOnce('access-token'); // accessToken
        password.mockResolvedValueOnce('token-secret'); // tokenSecret
        select.mockResolvedValueOnce('hmac-sha256'); // signatureMethod

        const result = await askForProfileSettings();
        expect(result).toEqual({
            type: 'magento-os',
            url: 'https://paas.test',
            auth: {
                method: 'oauth1',
                consumerKey: 'consumer-key',
                consumerSecret: 'consumer-secret',
                accessToken: 'access-token',
                tokenSecret: 'token-secret',
                signatureMethod: 'hmac-sha256'
            }
        });

        const consumerSecretValidate = password.mock.calls[0][0].validate;
        expect(consumerSecretValidate('secret')).toBe(true);
        expect(consumerSecretValidate('')).toBe('Consumer Secret is required');

        const accessTokenValidate = password.mock.calls[1][0].validate;
        expect(accessTokenValidate('token')).toBe(true);
        expect(accessTokenValidate('')).toBe('Access Token is required');

        const tokenSecretValidate = password.mock.calls[2][0].validate;
        expect(tokenSecretValidate('secret')).toBe(true);
        expect(tokenSecretValidate('')).toBe('Token Secret is required');
    });

    test('should prompt and return config for oauth1 with defaults', async () => {
        select.mockResolvedValueOnce('magento-os'); // type
        input.mockResolvedValueOnce('https://paas.test'); // url
        select.mockResolvedValueOnce('oauth1'); // method
        input.mockResolvedValueOnce('consumer-key'); // consumerKey
        password.mockResolvedValueOnce(''); // consumerSecret
        password.mockResolvedValueOnce(''); // accessToken
        password.mockResolvedValueOnce(''); // tokenSecret
        select.mockResolvedValueOnce('hmac-sha1'); // signatureMethod

        const defaults = {
            auth: {
                consumerSecret: 'def-cs',
                accessToken: 'def-at',
                tokenSecret: 'def-ts'
            }
        };

        const result = await askForProfileSettings(defaults);
        expect(result.auth.consumerSecret).toBe('def-cs');
        expect(result.auth.accessToken).toBe('def-at');
        expect(result.auth.tokenSecret).toBe('def-ts');

        expect(password.mock.calls[0][0].validate('')).toBe(true);
        expect(password.mock.calls[1][0].validate('')).toBe(true);
        expect(password.mock.calls[2][0].validate('')).toBe(true);
    });
});
