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
