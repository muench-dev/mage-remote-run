export const B2B_MODULES = [
    'Magento_Company',
    'Magento_CompanyCredit',
    'Magento_CompanyPayment',
    'Magento_CompanyShipping',
    'Magento_NegotiableQuote',
    'Magento_PurchaseOrder',
    'Magento_RequisitionList',
    'Magento_SharedCatalog'
];

export function getMissingB2BModules(modules = []) {
    const installed = new Set(modules);
    return B2B_MODULES.filter(moduleName => !installed.has(moduleName));
}

export function hasB2BModules(modules = []) {
    return getMissingB2BModules(modules).length === 0;
}
