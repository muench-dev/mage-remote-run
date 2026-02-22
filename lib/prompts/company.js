
export const COMPANY_CREATE_QUESTIONS = [
    { name: 'company_name', message: 'Company Name:' },
    { name: 'company_email', message: 'Company Email:' },
    { name: 'legal_name', message: 'Legal Name (optional):' },
    { name: 'vat_tax_id', message: 'VAT/Tax ID (optional):' },
    { name: 'reseller_id', message: 'Reseller ID (optional):' },
    { name: 'customer_group_id', message: 'Customer Group ID:', default: '1' },
    { name: 'sales_representative_id', message: 'Sales Representative ID (Admin User ID):', default: '1' },
    { name: 'email', message: 'Super Admin Email:' },
    { name: 'firstname', message: 'Super Admin First Name:' },
    { name: 'lastname', message: 'Super Admin Last Name:' }
];

export function getAddressQuestions(defaultCountry = 'US') {
    return [
        { name: 'street', message: 'Street:' },
        { name: 'city', message: 'City:' },
        { name: 'country_id', message: 'Country ID:', default: defaultCountry },
        { name: 'region', message: 'Region/State:' },
        { name: 'postcode', message: 'Postcode:' },
        { name: 'telephone', message: 'Telephone:' }
    ];
}

export function getCompanyUpdateQuestions(current) {
    return [
        { name: 'company_name', message: 'Company Name:', default: current.company_name },
        { name: 'company_email', message: 'Company Email:', default: current.company_email },
        { name: 'sales_representative_id', message: 'Sales Rep ID:', default: String(current.sales_representative_id) },
        { name: 'customer_group_id', message: 'Customer Group ID:', default: String(current.customer_group_id) }
    ];
}
