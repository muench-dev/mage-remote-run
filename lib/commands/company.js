import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerCompanyCommands(program) {
    const company = program.command('company').description('Manage companies');

    company.command('list')
        .description('List companies')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('--sort-by <field>', 'Field to sort by', 'entity_id')
        .option('--sort-order <order>', 'Sort order (ASC, DESC)', 'ASC')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
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

    company.command('show <companyId>')
        .description('Show company details')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
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
}
