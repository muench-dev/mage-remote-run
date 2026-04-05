import { jest } from '@jest/globals';

// Mock dependencies
jest.unstable_mockModule('axios', () => ({
    default: jest.fn()
}));
jest.unstable_mockModule('oauth-1.0a', () => ({
    default: jest.fn((options) => {
        return {
            authorize: jest.fn(),
            toHeader: jest.fn(() => ({ Authorization: 'OAuth ...' })),
            // Expose options for verification
            _options: options
        };
    })
}));
jest.unstable_mockModule('crypto', () => ({
    default: {
        createHmac: jest.fn(() => ({
            update: jest.fn(() => ({
                digest: jest.fn()
            }))
        }))
    }
}));
jest.unstable_mockModule('openapi-client-axios', () => ({
    OpenAPIClientAxios: class {
        getClient() {
            const mockAxios = jest.fn();
            mockAxios.interceptors = {
                request: {
                    use: jest.fn((handler) => {
                        mockAxios._requestHandler = handler;
                    })
                }
            };
            return Promise.resolve(mockAxios);
        }
    }
}));
jest.unstable_mockModule('../lib/api/spec-loader.js', () => ({
    loadSpec: jest.fn()
}));

const { PaasClient } = await import('../lib/api/paas.js');
const OAuth = (await import('oauth-1.0a')).default;
const crypto = (await import('crypto')).default;

describe('PaasClient OAuth Signature', () => {
    
    it('should default to HMAC-SHA256', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: {
                method: 'oauth1',
                consumerKey: 'ck',
                consumerSecret: 'cs',
                accessToken: 'at',
                tokenSecret: 'ts'
            }
        });

        await client.init();
        
        // Get the registered interceptor handler
        const interceptorHandler = client.axiosInstance._requestHandler;
        
        if (!interceptorHandler) {
             throw new Error('Interceptor not registered');
        }

        interceptorHandler({ 
            headers: {}, 
            method: 'get', 
            url: '/V1/products',
            baseURL: 'http://test.com/rest'
        });

        expect(OAuth).toHaveBeenCalledWith(expect.objectContaining({
            signature_method: 'HMAC-SHA256'
        }));
        
        // Check hashing function usage
        const options = OAuth.mock.calls[OAuth.mock.calls.length - 1][0];
        options.hash_function('base', 'key');
        expect(crypto.createHmac).toHaveBeenCalledWith('sha256', 'key');
    });

    it('should handle bearer auth in interceptor', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: {
                method: 'bearer',
                token: 'my-bearer-token'
            }
        });

        await client.init();
        const interceptorHandler = client.axiosInstance._requestHandler;
        if (!interceptorHandler) throw new Error('Interceptor not registered');

        const config = { headers: {}, method: 'get', url: '/V1/products' };
        interceptorHandler(config);

        expect(config.headers['Authorization']).toBe('Bearer my-bearer-token');
    });

    it('should call request and return data on success', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: { method: 'bearer', token: 'tok' }
        });

        await client.init();
        client.axiosInstance.mockResolvedValue({ data: { id: 1 } });

        const result = await client.request('get', '/V1/products');
        expect(result).toEqual({ id: 1 });
    });

    it('should throw API error with response status on request failure', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: { method: 'bearer', token: 'tok' }
        });

        await client.init();
        const axiosErr = new Error('Not Found');
        axiosErr.response = { status: 404, data: { message: 'Not Found' } };
        client.axiosInstance.mockRejectedValue(axiosErr);

        await expect(client.request('get', '/V1/notexist')).rejects.toThrow('API Error 404');
    });

    it('should rethrow non-response errors', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: { method: 'bearer', token: 'tok' }
        });

        await client.init();
        client.axiosInstance.mockRejectedValue(new Error('Network Error'));

        await expect(client.request('get', '/V1/products')).rejects.toThrow('Network Error');
    });

    it('should have working get/post/put/delete wrappers', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: { method: 'bearer', token: 'tok' }
        });

        await client.init();
        client.axiosInstance.mockResolvedValue({ data: 'ok' });

        expect(await client.get('/V1/test')).toBe('ok');
        expect(await client.post('/V1/test', {})).toBe('ok');
        expect(await client.put('/V1/test', {})).toBe('ok');
        expect(await client.delete('/V1/test')).toBe('ok');
    });

    it('should not call init twice', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: { method: 'bearer', token: 'tok' }
        });

        await client.init();
        const firstInstance = client.axiosInstance;
        await client.init(); // second call should be a no-op
        expect(client.axiosInstance).toBe(firstInstance);
    });

    it('should use HMAC-SHA1 when configured', async () => {
        const client = new PaasClient({
            type: 'magento-os',
            url: 'http://test.com',
            auth: {
                method: 'oauth1',
                consumerKey: 'ck',
                consumerSecret: 'cs',
                accessToken: 'at',
                tokenSecret: 'ts',
                signatureMethod: 'hmac-sha1'
            }
        });

        await client.init();
        const interceptorHandler = client.axiosInstance._requestHandler;
        
         if (!interceptorHandler) {
             throw new Error('Interceptor not registered');
        }
        
        interceptorHandler({ 
            headers: {}, 
            method: 'get', 
            url: '/V1/products',
            baseURL: 'http://test.com/rest'
        });

        expect(OAuth).toHaveBeenCalledWith(expect.objectContaining({
            signature_method: 'HMAC-SHA1'
        }));
        
        const options = OAuth.mock.calls[OAuth.mock.calls.length - 1][0];
        options.hash_function('base', 'key');
        expect(crypto.createHmac).toHaveBeenCalledWith('sha1', 'key');
    });
});
