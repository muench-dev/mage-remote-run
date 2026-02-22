import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import { COMPANY_CREATE_QUESTIONS, getAddressQuestions, getCompanyUpdateQuestions } from '../prompts/company.js';
import chalk from 'chalk';

export function registerCompanyCommands(program) {
    const company = program.command('company').description('Manage companies');


    //-------------------------------------------------------
    // "company list" Command
    //-------------------------------------------------------
    company.command('list')
        .description('List companies')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('--sort-by <field>', 'Field to sort by', 'entity_id')
        .option('--sort-order <order>', 'Sort order (ASC, DESC)', 'ASC')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company list
  $ mage-remote-run company list --page 2 --size 50
  $ mage-remote-run company list --sort-by company_name --sort-order DESC
  $ mage-remote-run company list --format json
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size,
                    'searchCriteria[sortOrders][0][field]': options.sortBy,
                    'searchCriteria[sortOrders][0][direction]': options.sortOrder
                };
                const data = await client.get('V1/company', params, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                // ID, Name, Email, Status, Rejected Reason
                const rows = (data.items || []).map(c => [
                    c.id,
                    c.company_name,
                    c.company_email,
                    c.status,
                    c.sales_representative_id || '-'
                ]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Name', 'Email', 'Status', 'Sales Rep ID'], rows);
            } catch (e) { handleError(e); }
        });


    //-------------------------------------------------------
    // "company show" Command
    //-------------------------------------------------------
    company.command('show <companyId>')
        .description('Show company details')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company show 123
  $ mage-remote-run company show 123 --format json
`)
        .action(async (companyId, options) => {
            try {
                const client = await createClient();
                let headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                let data;
                try {
                    data = await client.get(`V1/company/${encodeURIComponent(companyId)}`, {}, { headers });
                } catch (e) {
                    throw new Error(`Company '${companyId}' not found.`);
                }

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                console.log(chalk.bold.blue('\n🏢 Company Information'));
                console.log(chalk.gray('━'.repeat(60)));

                // General
                console.log(chalk.bold('\nℹ️  General Information'));
                console.log(`  ${chalk.bold('ID:')}             ${data.id}`);
                console.log(`  ${chalk.bold('Name:')}           ${data.company_name}`);
                console.log(`  ${chalk.bold('Email:')}          ${data.company_email}`);
                console.log(`  ${chalk.bold('Status:')}         ${data.status}`);
                console.log(`  ${chalk.bold('Rejected Reason:')} ${data.reject_reason || '-'}`);
                console.log(`  ${chalk.bold('Sales Rep ID:')}   ${data.sales_representative_id || '-'}`);

                // Address
                // Usually address info is nested or separate, but V1/company might return it directly
                if (data.street) {
                    console.log(chalk.bold('\n📍 Address'));
                    console.log(`  ${chalk.bold('Street:')}         ${data.street}`);
                    console.log(`  ${chalk.bold('City:')}           ${data.city}`);
                    console.log(`  ${chalk.bold('Region:')}         ${data.region}`);
                    console.log(`  ${chalk.bold('Postcode:')}       ${data.postcode}`);
                    console.log(`  ${chalk.bold('Country:')}        ${data.country_id}`);
                    console.log(`  ${chalk.bold('Phone:')}          ${data.telephone}`);
                }

                // Extension Attributes
                if (data.extension_attributes && data.extension_attributes.applicable_payment_method) {
                    console.log(chalk.bold('\n💳 Payment Methods'));
                    const methods = data.extension_attributes.applicable_payment_method.length > 0
                        ? data.extension_attributes.applicable_payment_method.join(', ')
                        : 'None';
                    console.log(`  ${methods}`);
                }

                console.log(chalk.gray('━'.repeat(60)));

            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company create" Command
    //-------------------------------------------------------
    company.command('create')
        .description('Create a new company')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company create
`)
        .action(async () => {
            try {
                const client = await createClient();
                const { default: inquirer } = await import('inquirer');

                // Prompt for basic info
                const answers = await inquirer.prompt(COMPANY_CREATE_QUESTIONS);

                // Address is required usually
                const defaultCountry = process.env.MAGE_DEFAULT_COUNTRY || 'US';
                const address = await inquirer.prompt(getAddressQuestions(defaultCountry));

                const payload = {
                    company: {
                        company_name: answers.company_name,
                        company_email: answers.company_email,
                        legal_name: answers.legal_name,
                        vat_tax_id: answers.vat_tax_id,
                        reseller_id: answers.reseller_id,
                        customer_group_id: answers.customer_group_id,
                        sales_representative_id: answers.sales_representative_id,
                        super_user_id: 0, // 0 for new user
                        street: [address.street],
                        city: address.city,
                        country_id: address.country_id,
                        region: { region: address.region }, // Simplified
                        postcode: address.postcode,
                        telephone: address.telephone
                    },
                    company_admin: {
                        email: answers.email,
                        firstname: answers.firstname,
                        lastname: answers.lastname
                    }
                };

                // POST /V1/company/
                const data = await client.post('V1/company', payload);
                console.log(chalk.green(`✅ Company created with ID: ${data.id}`));
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company update" Command
    //-------------------------------------------------------
    company.command('update <companyId>')
        .description('Update company details')
        .addHelpText('after', `
Examples:
  $ mage-remote-run company update 123
`)
        .action(async (companyId) => {
            try {
                const client = await createClient();
                const { default: inquirer } = await import('inquirer');

                // First fetch data
                let current;
                try {
                    current = await client.get(`V1/company/${companyId}`);
                } catch (e) {
                    throw new Error(`Company ${companyId} not found.`);
                }

                const answers = await inquirer.prompt(getCompanyUpdateQuestions(current));

                // Merge
                const payload = {
                    company: {
                        ...current,
                        ...answers
                    }
                };

                await client.put(`V1/company/${companyId}`, payload);
                console.log(chalk.green(`✅ Company ${companyId} updated.`));
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company delete" Command
    //-------------------------------------------------------
    company.command('delete <companyId>')
        .description('Delete a company')
        .option('--force', 'Force delete without confirmation')
        .action(async (companyId, options) => {
            try {
                const client = await createClient();
                const { default: inquirer } = await import('inquirer');

                if (!options.force) {
                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete company ${companyId}?`,
                        default: false
                    }]);
                    if (!confirm) return;
                }

                await client.delete(`V1/company/${companyId}`);
                console.log(chalk.green(`✅ Company ${companyId} deleted.`));
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company structure" Command
    //-------------------------------------------------------
    company.command('structure <companyId>')
        .description('Show company structure (hierarchy)')
        .action(async (companyId) => {
            try {
                const client = await createClient();
                // GET /V1/company/relations usually returns the user structure.
                // However, without a specific hierarchy endpoint that is easy to visualize, we might just dump data.
                const data = await client.get(`V1/company/${companyId}`);
                console.log(chalk.bold(`Company Structure for ${data.company_name} (${data.id})`));
                console.log('Hierarchy visualization requires more complex data. Showing basic info.');
                console.log(`Parent ID: ${data.parent_id || 'None'}`);
                console.log(`Legal Name: ${data.legal_name || '-'}`);
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company role" Group
    //-------------------------------------------------------
    const role = company.command('role').description('Manage company roles');

    role.command('list')
        .description('List roles')
        .action(async () => {
            try {
                const client = await createClient();
                // Assuming lists all roles visible to admin context
                const data = await client.get('V1/company/role', { 'searchCriteria[pageSize]': 20 });
                const items = data.items || [];
                const rows = items.map(r => [r.role_id, r.role_name, r.company_id]);
                console.log(chalk.bold(`Total Roles: ${data.total_count}`));
                printTable(['ID', 'Name', 'Company ID'], rows);
            } catch (e) { handleError(e); }
        });

    role.command('show <roleId>')
        .description('Show role details')
        .action(async (roleId) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/company/role/${roleId}`);
                console.log(chalk.bold(`\nRole: ${data.role_name} (ID: ${data.role_id})`));
                if (data.permissions) {
                    console.log(chalk.bold('\nPermissions:'));
                    data.permissions.forEach(p => console.log(` - ${p.resource_id}: ${p.permission}`));
                }
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "company credit" Group
    //-------------------------------------------------------
    const credit = company.command('credit').description('Manage company credits');

    credit.command('show <companyId>')
        .description('Show credit for company')
        .action(async (companyId) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/companyCredits/company/${companyId}`);
                console.log(chalk.bold(`\nCredit ID: ${data.id}`));
                console.log(`Balance: ${data.balance} ${data.currency_code}`);
                console.log(`Limit:   ${data.credit_limit} ${data.currency_code}`);
                console.log(`Avail:   ${data.available_limit} ${data.currency_code}`);
            } catch (e) { handleError(e); }
        });

    credit.command('history <companyId>')
        .description('Show credit history')
        .option('-p, --page <number>', 'Page number', '1')
        .action(async (companyId, options) => {
            try {
                const client = await createClient();

                // 1. Get Credit ID for the company
                let creditData;
                try {
                    creditData = await client.get(`V1/companyCredits/company/${companyId}`);
                } catch (e) {
                    throw new Error(`Could not find credit profile for company ${companyId}`);
                }
                const creditId = creditData.id;

                // 2. Search History by company_credit_id
                const params = {
                    'searchCriteria[filterGroups][0][filters][0][field]': 'company_credit_id',
                    'searchCriteria[filterGroups][0][filters][0][value]': creditId,
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': 20
                };
                const data = await client.get('V1/companyCredits/history', params);

                if (data.total_count === 0) {
                    console.log(chalk.yellow('No history found.'));
                    return;
                }

                const typeMap = {
                    1: 'Allocate',
                    2: 'Reimburse',
                    3: 'Purchase',
                    4: 'Refund',
                    5: 'Revert',
                    6: 'Currency Update'
                };
                const rows = (data.items || []).map(h => [
                    h.datetime,
                    `${typeMap[h.type] || 'Unknown'} (${h.type})`,
                    h.amount,
                    h.balance,
                    h.comment
                ]);
                console.log(chalk.bold(`Total Entries: ${data.total_count}`));
                printTable(['Date', 'Type', 'Amount', 'Balance', 'Comment'], rows);
            } catch (e) { handleError(e); }
        });

    credit.command('increase [creditId] [amount]')
        .description('Increase balance')
        .option('--currency <code >', 'Currency code')
        .option('--type <number>', 'Operation Type (1=Allocate, 2=Reimburse, 4=Refund, 5=Revert)')
        .option('--comment <text>', 'Comment', 'Manual increase')
        .option('--po <number>', 'PO Number', '')
        .action(async (creditId, amount, options) => {
            try {
                const client = await createClient();
                const inquirer = (await import('inquirer')).default;
                const { select } = await import('@inquirer/prompts');

                let isInteractive = false;
                if (!creditId) {
                    isInteractive = true;
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'creditId',
                        message: 'Enter Credit ID:'
                    }]);
                    creditId = ans.creditId;
                }

                if (!amount) {
                    isInteractive = true;
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'amount',
                        message: 'Enter Amount:'
                    }]);
                    amount = ans.amount;
                }

                // Operation Type Selection (if not provided)
                let operationType = options.type;
                if (!operationType) {
                    if (isInteractive) {
                        operationType = await select({
                            message: 'Select Operation Type:',
                            choices: [
                                { name: 'Reimburse (2)', value: 2 },
                                { name: 'Allocate (1)', value: 1 },
                                { name: 'Refund (4)', value: 4 },
                                { name: 'Revert (5)', value: 5 }
                            ],
                            default: 2
                        });
                    } else {
                        operationType = 2;
                    }
                }

                // 1. Get current credit details to find currency
                let currency = options.currency;
                if (!currency) {
                    try {
                        const creditData = await client.get(`V1/companyCredits/${creditId}`);
                        currency = creditData.currency_code;
                    } catch (e) {
                        console.warn(chalk.yellow('Could not fetch credit details to determine currency. Using interactive prompt.'));
                    }
                }

                if (!currency) {
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'currency',
                        message: 'Enter currency code:',
                        default: 'USD'
                    }]);
                    currency = ans.currency;
                }

                const payload = {
                    value: parseFloat(amount),
                    currency: currency,
                    operationType: parseInt(operationType), // 1=Allocate, 2=Reimburse, 4=Refund, 5=Revert
                    comment: options.comment,
                    options: {
                        purchase_order: options.po,
                        order_increment: '',
                        currency_display: currency,
                        currency_base: currency
                    }
                };

                await client.post(`V1/companyCredits/${creditId}/increaseBalance`, payload);
                console.log(chalk.green(`✅ Credit ${creditId} increased by ${amount} ${currency}`));
            } catch (e) { handleError(e); }
        });

    credit.command('decrease [creditId] [amount]')
        .description('Decrease balance')
        .option('--currency <code>', 'Currency code')
        .option('--type <number>', 'Operation Type (3=Purchase)')
        .option('--comment <text>', 'Comment', 'Manual decrease')
        .option('--po <number>', 'PO Number', '')
        .action(async (creditId, amount, options) => {
            try {
                const client = await createClient();
                const inquirer = (await import('inquirer')).default;
                const { select } = await import('@inquirer/prompts');

                let isInteractive = false;
                if (!creditId) {
                    isInteractive = true;
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'creditId',
                        message: 'Enter Credit ID:'
                    }]);
                    creditId = ans.creditId;
                }

                if (!amount) {
                    isInteractive = true;
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'amount',
                        message: 'Enter Amount:'
                    }]);
                    amount = ans.amount;
                }

                // Operation Type Selection (if not provided)
                let operationType = options.type;
                if (!operationType) {
                    if (isInteractive) {
                        operationType = await select({
                            message: 'Select Operation Type:',
                            choices: [
                                { name: 'Purchase (3)', value: 3 },
                                { name: 'Reimburse (2)', value: 2 }
                            ],
                            default: 3
                        });
                    } else {
                        operationType = 3;
                    }
                }

                // 1. Get current credit details to find currency
                let currency = options.currency;
                if (!currency) {
                    try {
                        const creditData = await client.get(`V1/companyCredits/${creditId}`);
                        currency = creditData.currency_code;
                    } catch (e) {
                        console.warn(chalk.yellow('Could not fetch credit details to determine currency. Using interactive prompt.'));
                    }
                }

                if (!currency) {
                    const ans = await inquirer.prompt([{
                        type: 'input',
                        name: 'currency',
                        message: 'Enter currency code:',
                        default: 'USD'
                    }]);
                    currency = ans.currency;
                }

                const payload = {
                    value: parseFloat(amount),
                    currency: currency,
                    operationType: parseInt(operationType),
                    comment: options.comment,
                    options: {
                        purchase_order: options.po,
                        order_increment: '',
                        currency_display: currency,
                        currency_base: currency
                    }
                };

                await client.post(`V1/companyCredits/${creditId}/decreaseBalance`, payload);
                console.log(chalk.green(`✅ Credit ${creditId} decreased by ${amount} ${currency}`));
            } catch (e) { handleError(e); }
        });
}
