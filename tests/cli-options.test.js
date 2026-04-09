import { hasIgnorePluginsFlag } from '../lib/cli-options.js';

describe('CLI options helpers', () => {
    it('detects the ignore plugins global flag', () => {
        expect(hasIgnorePluginsFlag(['--ignore-plugins', 'plugin', 'list'])).toBe(true);
    });

    it('returns false when the ignore plugins global flag is absent', () => {
        expect(hasIgnorePluginsFlag(['plugin', 'list'])).toBe(false);
    });
});
