import { describe, it, expect } from '@jest/globals';
import { getMissingB2BModules, hasB2BModules, B2B_MODULES } from '../lib/b2b.js';

describe('B2B module helpers', () => {
    it('returns missing modules when not all installed', () => {
        const installed = [
            'Magento_Company',
            'Magento_CompanyCredit',
            'Magento_PurchaseOrder'
        ];

        const missing = getMissingB2BModules(installed);
        expect(missing.length).toBeGreaterThan(0);
        expect(missing).toContain('Magento_CompanyPayment');
    });

    it('detects when all B2B modules are installed', () => {
        expect(hasB2BModules(B2B_MODULES)).toBe(true);
    });

    it('returns false when modules list is empty', () => {
        expect(hasB2BModules([])).toBe(false);
    });
});
