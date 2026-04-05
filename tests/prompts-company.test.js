import { COMPANY_CREATE_QUESTIONS, getAddressQuestions, getCompanyUpdateQuestions } from '../lib/prompts/company.js';

describe('Company Prompts', () => {
    describe('COMPANY_CREATE_QUESTIONS', () => {
        test('should be an array', () => {
            expect(Array.isArray(COMPANY_CREATE_QUESTIONS)).toBe(true);
        });

        test('should contain expected fields', () => {
            const names = COMPANY_CREATE_QUESTIONS.map(q => q.name);
            expect(names).toContain('company_name');
            expect(names).toContain('company_email');
            expect(names).toContain('legal_name');
            expect(names).toContain('vat_tax_id');
            expect(names).toContain('reseller_id');
            expect(names).toContain('customer_group_id');
            expect(names).toContain('sales_representative_id');
            expect(names).toContain('email');
            expect(names).toContain('firstname');
            expect(names).toContain('lastname');
        });

        test('should have default values for certain fields', () => {
            const customerGroup = COMPANY_CREATE_QUESTIONS.find(q => q.name === 'customer_group_id');
            expect(customerGroup.default).toBe('1');

            const salesRep = COMPANY_CREATE_QUESTIONS.find(q => q.name === 'sales_representative_id');
            expect(salesRep.default).toBe('1');
        });
    });

    describe('getAddressQuestions', () => {
        test('should return an array of questions', () => {
            const questions = getAddressQuestions();
            expect(Array.isArray(questions)).toBe(true);
            expect(questions.length).toBe(6);
        });

        test('should use default country US if none provided', () => {
            const questions = getAddressQuestions();
            const countryId = questions.find(q => q.name === 'country_id');
            expect(countryId.default).toBe('US');
        });

        test('should use provided default country', () => {
            const questions = getAddressQuestions('DE');
            const countryId = questions.find(q => q.name === 'country_id');
            expect(countryId.default).toBe('DE');
        });

        test('should contain expected address fields', () => {
            const questions = getAddressQuestions();
            const names = questions.map(q => q.name);
            expect(names).toEqual(['street', 'city', 'country_id', 'region', 'postcode', 'telephone']);
        });
    });

    describe('getCompanyUpdateQuestions', () => {
        const current = {
            company_name: 'Test Co',
            company_email: 'test@co.com',
            sales_representative_id: 5,
            customer_group_id: 2
        };

        test('should return an array of questions', () => {
            const questions = getCompanyUpdateQuestions(current);
            expect(Array.isArray(questions)).toBe(true);
            expect(questions.length).toBe(4);
        });

        test('should set default values from current company object', () => {
            const questions = getCompanyUpdateQuestions(current);

            expect(questions.find(q => q.name === 'company_name').default).toBe('Test Co');
            expect(questions.find(q => q.name === 'company_email').default).toBe('test@co.com');
            expect(questions.find(q => q.name === 'sales_representative_id').default).toBe('5');
            expect(questions.find(q => q.name === 'customer_group_id').default).toBe('2');
        });

        test('should handle numeric values by converting to string for defaults', () => {
            const questions = getCompanyUpdateQuestions(current);
            expect(typeof questions.find(q => q.name === 'sales_representative_id').default).toBe('string');
            expect(typeof questions.find(q => q.name === 'customer_group_id').default).toBe('string');
        });
    });
});
