import { jest } from '@jest/globals';

jest.unstable_mockModule('fs', () => ({
    default: {
        existsSync: jest.fn(),
        readFileSync: jest.fn()
    }
}));

const fs = (await import('fs')).default;
const { loadSpec } = await import('../lib/api/spec-loader.js');

describe('loadSpec', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should load SaaS spec for ac-saas type', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"openapi": "3.0.0"}');

        const result = loadSpec('ac-saas');

        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('swagger-saas.json'));
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('swagger-saas.json'), 'utf-8');
        expect(result).toEqual({ openapi: '3.0.0' });
    });

    it('should load SaaS spec for saas type', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"openapi": "3.0.0"}');

        const result = loadSpec('saas');

        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('swagger-saas.json'));
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('swagger-saas.json'), 'utf-8');
        expect(result).toEqual({ openapi: '3.0.0' });
    });

    it('should load PaaS spec for other types', () => {
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"openapi": "3.0.0"}');

        const result = loadSpec('paas');

        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('swagger-paas.json'));
        expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('swagger-paas.json'), 'utf-8');
        expect(result).toEqual({ openapi: '3.0.0' });
    });

    it('should throw error if spec file not found', () => {
        fs.existsSync.mockReturnValue(false);

        expect(() => loadSpec('paas')).toThrow('OpenAPI spec not found');
    });

    it('should parse JSON correctly', () => {
        fs.existsSync.mockReturnValue(true);
        const jsonContent = JSON.stringify({ paths: { '/test': {} } });
        fs.readFileSync.mockReturnValue(jsonContent);

        const result = loadSpec('paas');

        expect(result).toEqual({ paths: { '/test': {} } });
    });
});
