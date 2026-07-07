import { jest } from '@jest/globals';

const chalkProxy = new Proxy(function (str) { return str; }, {
    get: (target, prop) => {
        if (prop === 'default') return chalkProxy;
        if (prop === 'hex') return () => chalkProxy;
        return chalkProxy;
    },
    apply: (target, thisArg, args) => args[0]
});

jest.unstable_mockModule('chalk', () => ({
    default: chalkProxy
}));

const { getLogoForType } = await import('../lib/logos.js');

describe('logos.js getLogoForType', () => {
    it('returns adobe logo for type starting with ac-', () => {
        const logo1 = getLogoForType('ac-foo');
        expect(logo1).toContain('@@@@@@@@@@@@@@@');

        const logo2 = getLogoForType('ac-');
        expect(logo2).toContain('@@@@@@@@@@@@@@@');
    });

    it('returns mageos logo for type mage-os', () => {
        const logo = getLogoForType('mage-os');
        expect(logo).toContain('======          ======');
    });

    it('returns magento logo for type magento-os', () => {
        const logo = getLogoForType('magento-os');
        expect(logo).toContain('@@@@@@@@');
    });

    it('returns empty string for undefined or null or empty string', () => {
        expect(getLogoForType()).toBe('');
        expect(getLogoForType(null)).toBe('');
        expect(getLogoForType('')).toBe('');
    });

    it('returns empty string for unknown types', () => {
        expect(getLogoForType('unknown-type')).toBe('');
        expect(getLogoForType('ac')).toBe(''); // Does not start with ac-
        expect(getLogoForType('mageos')).toBe('');
    });
});
