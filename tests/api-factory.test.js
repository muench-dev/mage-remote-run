import { jest } from '@jest/globals';

// Mock Config
jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn(),
    getActiveProfile: jest.fn()
}));

// Mock API Clients
jest.unstable_mockModule('../lib/api/saas.js', () => ({
    SaasClient: jest.fn()
}));

jest.unstable_mockModule('../lib/api/paas.js', () => ({
    PaasClient: jest.fn()
}));

// Import the module under test
const { createClient } = await import('../lib/api/factory.js');

// Import mocked modules to set return values
const { loadConfig, getActiveProfile } = await import('../lib/config.js');
const { SaasClient } = await import('../lib/api/saas.js');
const { PaasClient } = await import('../lib/api/paas.js');

describe('API Client Factory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createClient', () => {
        it('should return SaasClient when config object type is saas', async () => {
            const config = { type: 'saas', url: 'https://example.com' };
            await createClient(config);
            expect(SaasClient).toHaveBeenCalledWith(config);
            expect(PaasClient).not.toHaveBeenCalled();
        });

        it('should return SaasClient when config object type is ac-saas', async () => {
            const config = { type: 'ac-saas', url: 'https://example.com' };
            await createClient(config);
            expect(SaasClient).toHaveBeenCalledWith(config);
            expect(PaasClient).not.toHaveBeenCalled();
        });

        it('should return PaasClient when config object type is paas', async () => {
            const config = { type: 'paas', url: 'https://example.com' };
            await createClient(config);
            expect(PaasClient).toHaveBeenCalledWith(config);
            expect(SaasClient).not.toHaveBeenCalled();
        });

        it('should return PaasClient when config object type is magento-os', async () => {
            const config = { type: 'magento-os', url: 'https://example.com' };
            await createClient(config);
            expect(PaasClient).toHaveBeenCalledWith(config);
            expect(SaasClient).not.toHaveBeenCalled();
        });

        it('should return SaasClient when profile name points to saas profile', async () => {
            const profileName = 'test-saas';
            const config = {
                profiles: {
                    'test-saas': { type: 'saas', url: 'https://saas.example.com' }
                }
            };
            loadConfig.mockResolvedValue(config);

            await createClient(profileName);

            expect(loadConfig).toHaveBeenCalled();
            expect(SaasClient).toHaveBeenCalledWith(config.profiles['test-saas']);
        });

        it('should return PaasClient when profile name points to paas profile', async () => {
            const profileName = 'test-paas';
            const config = {
                profiles: {
                    'test-paas': { type: 'paas', url: 'https://paas.example.com' }
                }
            };
            loadConfig.mockResolvedValue(config);

            await createClient(profileName);

            expect(loadConfig).toHaveBeenCalled();
            expect(PaasClient).toHaveBeenCalledWith(config.profiles['test-paas']);
        });

        it('should return SaasClient when no args and active profile is saas', async () => {
            const activeProfile = { type: 'saas', url: 'https://saas.example.com' };
            getActiveProfile.mockResolvedValue(activeProfile);

            await createClient();

            expect(getActiveProfile).toHaveBeenCalled();
            expect(SaasClient).toHaveBeenCalledWith(activeProfile);
        });

        it('should return PaasClient when no args and active profile is paas', async () => {
            const activeProfile = { type: 'paas', url: 'https://paas.example.com' };
            getActiveProfile.mockResolvedValue(activeProfile);

            await createClient();

            expect(getActiveProfile).toHaveBeenCalled();
            expect(PaasClient).toHaveBeenCalledWith(activeProfile);
        });

        it('should throw error when no active profile found (getActiveProfile returns null)', async () => {
            getActiveProfile.mockResolvedValue(null);

            await expect(createClient()).rejects.toThrow("No active profile found. Please run 'mage-remote-run configure'.");
        });

        it('should throw error when profile name not found in config', async () => {
            const profileName = 'non-existent';
            const config = {
                profiles: {}
            };
            loadConfig.mockResolvedValue(config);

            await expect(createClient(profileName)).rejects.toThrow("No active profile found. Please run 'mage-remote-run configure'.");
        });
    });
});
