import { jest } from '@jest/globals';

jest.unstable_mockModule('../lib/config.js', () => ({
    loadConfig: jest.fn(),
    saveConfig: jest.fn(),
}));

const utils = await import('../lib/utils.js');
const commandHelper = await import('../lib/command-helper.js');
const { loadConfig, saveConfig } = await import('../lib/config.js');

describe('appContext.lib', () => {
    it('lib.utils exposes printTable', () => {
        expect(typeof utils.printTable).toBe('function');
    });

    it('lib.utils exposes handleError', () => {
        expect(typeof utils.handleError).toBe('function');
    });

    it('lib.utils exposes buildSearchCriteria', () => {
        expect(typeof utils.buildSearchCriteria).toBe('function');
    });

    it('lib.utils exposes buildSortCriteria', () => {
        expect(typeof utils.buildSortCriteria).toBe('function');
    });

    it('lib.utils exposes addFilterOption', () => {
        expect(typeof utils.addFilterOption).toBe('function');
    });

    it('lib.utils exposes addSortOption', () => {
        expect(typeof utils.addSortOption).toBe('function');
    });

    it('lib.utils exposes addPaginationOptions', () => {
        expect(typeof utils.addPaginationOptions).toBe('function');
    });

    it('lib.utils exposes addFormatOption', () => {
        expect(typeof utils.addFormatOption).toBe('function');
    });

    it('lib.utils exposes formatOutput', () => {
        expect(typeof utils.formatOutput).toBe('function');
    });

    it('lib.utils exposes applyLocalSearchCriteria', () => {
        expect(typeof utils.applyLocalSearchCriteria).toBe('function');
    });

    it('lib.commandHelper exposes expandCommandAbbreviations', () => {
        expect(typeof commandHelper.expandCommandAbbreviations).toBe('function');
    });

    it('lib.commandHelper exposes resolveCommandMatch', () => {
        expect(typeof commandHelper.resolveCommandMatch).toBe('function');
    });

    it('lib.config exposes loadConfig', () => {
        expect(typeof loadConfig).toBe('function');
    });

    it('lib.config exposes saveConfig', () => {
        expect(typeof saveConfig).toBe('function');
    });
});
