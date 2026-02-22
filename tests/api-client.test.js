import { ApiClient } from '../lib/api/client.js';

describe('ApiClient', () => {
    describe('constructor', () => {
        it('should initialize config and baseUrl correctly', () => {
            const config = { url: 'https://example.com/' };
            const client = new ApiClient(config);

            expect(client.config).toBe(config);
            expect(client.baseUrl).toBe('https://example.com');
        });

        it('should handle URL without trailing slash', () => {
            const config = { url: 'https://example.com' };
            const client = new ApiClient(config);

            expect(client.baseUrl).toBe('https://example.com');
        });
    });

    describe('methods', () => {
        let client;

        beforeEach(() => {
            client = new ApiClient({ url: 'https://example.com/' });
        });

        it('should throw error for get()', async () => {
            await expect(client.get('/endpoint')).rejects.toThrow('Method not implemented');
        });

        it('should throw error for post()', async () => {
            await expect(client.post('/endpoint', {})).rejects.toThrow('Method not implemented');
        });

        it('should throw error for put()', async () => {
            await expect(client.put('/endpoint', {})).rejects.toThrow('Method not implemented');
        });

        it('should throw error for delete()', async () => {
            await expect(client.delete('/endpoint')).rejects.toThrow('Method not implemented');
        });
    });
});
