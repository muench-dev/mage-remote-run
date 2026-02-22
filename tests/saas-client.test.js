import { jest } from '@jest/globals';

// Define mocks
jest.unstable_mockModule('axios', () => ({
    default: {
        post: jest.fn(),
        interceptors: {
            request: { use: jest.fn() }
        }
    }
}));

jest.unstable_mockModule('openapi-client-axios', () => ({
    OpenAPIClientAxios: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
            interceptors: { request: { use: jest.fn() } }
        })
    }))
}));

jest.unstable_mockModule('../lib/api/spec-loader.js', () => ({
    loadSpec: jest.fn().mockReturnValue({})
}));

jest.unstable_mockModule('../lib/config.js', () => ({
    loadTokenCache: jest.fn(),
    saveTokenCache: jest.fn()
}));

// Dynamic imports
const axios = (await import('axios')).default;
const configMod = await import('../lib/config.js');
const { SaasClient } = await import('../lib/api/saas.js');

describe('SaasClient', () => {
    let client;
    let config;

    beforeEach(() => {
        config = {
            type: 'ac-saas',
            url: 'https://saas.test',
            auth: {
                clientId: 'test-id',
                clientSecret: 'test-secret'
            }
        };
        client = new SaasClient(config);
        jest.clearAllMocks();
    });

    it('should use default IMS URL when tokenUrl is not configured', async () => {
        configMod.loadTokenCache.mockResolvedValue({});
        axios.post.mockResolvedValue({
            data: { access_token: 'new-token', expires_in: 3600 }
        });

        await client.getToken();

        expect(axios.post).toHaveBeenCalledWith(
            'https://ims-na1.adobelogin.com/ims/token/v3',
            expect.any(String),
            expect.any(Object)
        );
    });

    it('should use configured IMS URL when tokenUrl is present', async () => {
        config.auth.tokenUrl = 'https://custom-ims.test/token';
        client = new SaasClient(config); // Re-create client with new config

        configMod.loadTokenCache.mockResolvedValue({});
        axios.post.mockResolvedValue({
            data: { access_token: 'new-token', expires_in: 3600 }
        });

        await client.getToken();

        expect(axios.post).toHaveBeenCalledWith(
            'https://custom-ims.test/token',
            expect.any(String),
            expect.any(Object)
        );
    });

    it('should fallback to oauth/token for other types', async () => {
        config.type = 'other-type';
        client = new SaasClient(config);

        configMod.loadTokenCache.mockResolvedValue({});
        axios.post.mockResolvedValue({
            data: { access_token: 'new-token', expires_in: 3600 }
        });

        await client.getToken();

        expect(axios.post).toHaveBeenCalledWith(
            'https://saas.test/oauth/token',
            expect.any(Object) // Payload is object for other types
        );
    });
});
