import { jest } from '@jest/globals';

// Mock Config
jest.unstable_mockModule('../lib/config.js', () => ({
    loadTokenCache: jest.fn(),
    saveTokenCache: jest.fn()
}));

// Mock axios
jest.unstable_mockModule('axios', () => ({
    default: {
        post: jest.fn()
    }
}));

// Mock spec-loader
jest.unstable_mockModule('../lib/api/spec-loader.js', () => ({
    loadSpec: jest.fn()
}));

// Mock openapi-client-axios
jest.unstable_mockModule('openapi-client-axios', () => ({
    OpenAPIClientAxios: jest.fn().mockImplementation(() => ({
        getClient: jest.fn().mockResolvedValue({
            interceptors: {
                request: { use: jest.fn() }
            }
        })
    }))
}));

const { SaasClient } = await import('../lib/api/saas.js');
const { loadTokenCache, saveTokenCache } = await import('../lib/config.js');
const axios = (await import('axios')).default;

describe('SaasClient', () => {
    let client;
    let config;

    beforeEach(() => {
        jest.clearAllMocks();
        config = {
            type: 'saas',
            url: 'https://example.com',
            auth: {
                clientId: 'test-client',
                clientSecret: 'test-secret'
            }
        };
        client = new SaasClient(config);
    });

    describe('getToken', () => {
        it('should return static token from config if present', async () => {
            client.config.auth.token = 'static-token';
            const token = await client.getToken();
            expect(token).toBe('static-token');
            expect(loadTokenCache).not.toHaveBeenCalled();
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should return in-memory token if valid', async () => {
            client.token = 'memory-token';
            client.tokenExpiresAt = Date.now() + 10000;
            const token = await client.getToken();
            expect(token).toBe('memory-token');
            expect(loadTokenCache).not.toHaveBeenCalled();
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should return cached token if valid', async () => {
            const cacheKey = 'saas|https://example.com|test-client';
            const cachedToken = {
                token: 'cached-token',
                expiresAt: Date.now() + 10000
            };
            loadTokenCache.mockResolvedValue({
                [cacheKey]: cachedToken
            });

            const token = await client.getToken();
            expect(token).toBe('cached-token');
            expect(client.token).toBe('cached-token');
            expect(axios.post).not.toHaveBeenCalled();
        });

        it('should fetch new token for saas type', async () => {
            loadTokenCache.mockResolvedValue({});
            axios.post.mockResolvedValue({
                data: {
                    access_token: 'new-token',
                    expires_in: 3600
                }
            });

            const token = await client.getToken();
            expect(token).toBe('new-token');
            expect(axios.post).toHaveBeenCalledWith(
                'https://ims-na1.adobelogin.com/ims/token/v3',
                expect.stringContaining('grant_type=client_credentials'),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
            );
            expect(saveTokenCache).toHaveBeenCalled();
        });

        it('should fetch new token for ac-saas type', async () => {
            client.config.type = 'ac-saas';
            loadTokenCache.mockResolvedValue({});
            axios.post.mockResolvedValue({
                data: {
                    access_token: 'new-token',
                    expires_in: 3600
                }
            });

            const token = await client.getToken();
            expect(token).toBe('new-token');
            expect(axios.post).toHaveBeenCalledWith(
                'https://ims-na1.adobelogin.com/ims/token/v3',
                expect.stringContaining('grant_type=client_credentials'),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
            );
            expect(saveTokenCache).toHaveBeenCalled();
        });

        it('should fetch new token for other types', async () => {
            client.config.type = 'other';
            loadTokenCache.mockResolvedValue({});
            axios.post.mockResolvedValue({
                data: {
                    access_token: 'new-token',
                    expires_in: 3600
                }
            });

            const token = await client.getToken();
            expect(token).toBe('new-token');
            expect(axios.post).toHaveBeenCalledWith(
                'https://example.com/oauth/token',
                expect.objectContaining({
                    grant_type: 'client_credentials',
                    client_id: 'test-client',
                    client_secret: 'test-secret'
                })
            );
            expect(saveTokenCache).toHaveBeenCalled();
        });

        it('should throw error if fetch fails', async () => {
            loadTokenCache.mockResolvedValue({});
            axios.post.mockRejectedValue(new Error('Network error'));

            await expect(client.getToken()).rejects.toThrow('Failed to obtain OAuth2 token: Network error');
        });
    });
});
