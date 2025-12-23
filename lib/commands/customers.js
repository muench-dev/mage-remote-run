import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerCustomersCommands(program) {
    const customers = program.command('customer').description('Manage customers');

    customers.command('list')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('V1/customers/search', params);
                const rows = (data.items || []).map(c => [c.id, c.email, c.firstname, c.lastname, c.group_id]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Email', 'First Name', 'Last Name', 'Group'], rows);
            } catch (e) { handleError(e); }
        });

    customers.command('search <query>')
        .description('Search customers by email')
        .action(async (query) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[filter_groups][0][filters][0][field]': 'email',
                    'searchCriteria[filter_groups][0][filters][0][value]': `%${query}%`,
                    'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like'
                };
                const data = await client.get('V1/customers/search', params);
                const rows = (data.items || []).map(c => [c.id, c.email, c.firstname, c.lastname]);
                printTable(['ID', 'Email', 'Name', 'Lastname'], rows);
            } catch (e) { handleError(e); }
        });

    customers.command('edit <id>')
        .action(async (id) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/customers/${id}`);

                const answers = await inquirer.prompt([
                    { name: 'firstname', message: 'First Name', default: data.firstname },
                    { name: 'lastname', message: 'Last Name', default: data.lastname },
                    { name: 'email', message: 'Email', default: data.email }
                ]);

                const payload = {
                    customer: {
                        ...data,
                        firstname: answers.firstname,
                        lastname: answers.lastname,
                        email: answers.email
                    }
                };

                await client.put(`V1/customers/${id}`, payload);
                console.log(chalk.green(`Customer ${id} updated.`));
            } catch (e) { handleError(e); }
        });

    customers.command('show <customerId>')
        .description('Show detailed customer information')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (customerId, options) => {
            try {
                const client = await createClient();
                let headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const data = await client.get(`V1/customers/${customerId}`, {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                console.log(chalk.bold.blue('\n👤 Customer Information'));
                console.log(chalk.gray('━'.repeat(60)));

                console.log(chalk.bold('\nℹ️  General Information'));
                console.log(`  ${chalk.bold('ID:')}             ${data.id}`);
                console.log(`  ${chalk.bold('Email:')}          ${data.email}`);
                console.log(`  ${chalk.bold('First Name:')}     ${data.firstname}`);
                console.log(`  ${chalk.bold('Last Name:')}      ${data.lastname}`);
                console.log(`  ${chalk.bold('Group ID:')}       ${data.group_id}`);
                console.log(`  ${chalk.bold('Created At:')}     ${data.created_at}`);
                console.log(`  ${chalk.bold('Updated At:')}     ${data.updated_at}`);
                console.log(`  ${chalk.bold('Website ID:')}     ${data.website_id}`);
                console.log(`  ${chalk.bold('Store ID:')}       ${data.store_id}`);

                if (data.addresses && data.addresses.length > 0) {
                    console.log(chalk.bold('\n📍 Addresses'));
                    data.addresses.forEach((addr, idx) => {
                        console.log(chalk.bold(`  Address #${idx + 1} ${addr.default_billing ? '(Default Billing)' : ''} ${addr.default_shipping ? '(Default Shipping)' : ''}`));
                        const addressLines = [
                            `    ${addr.firstname} ${addr.lastname}`,
                            ...(addr.street || []).map(s => `    ${s}`),
                            `    ${addr.city}, ${addr.region ? addr.region.region : ''} ${addr.postcode}`,
                            `    ${addr.country_id}`,
                            `    T: ${addr.telephone}`
                        ];
                        console.log(addressLines.join('\n'));
                        console.log('');
                    });
                }
                console.log(chalk.gray('━'.repeat(60)));

            } catch (e) { handleError(e); }
        });

    customers.command('delete <customerId>')
        .description('Delete a customer')
        .option('--force', 'Force delete without confirmation')
        .action(async (customerId, options) => {
            try {
                if (!options.force) {
                    const { confirm } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete customer ${customerId}?`,
                        default: false
                    }]);
                    if (!confirm) {
                        console.log('Operation cancelled.');
                        return;
                    }
                }

                const client = await createClient();
                await client.delete(`V1/customers/${customerId}`);
                console.log(chalk.green(`✅ Customer ${customerId} deleted.`));
            } catch (e) { handleError(e); }
        });

    customers.command('confirm [customerId]')
        .description('Resend customer confirmation email')
        .option('--redirect-url <url>', 'Redirect URL after confirmation')
        .action(async (customerId, options) => {
            try {
                const client = await createClient();
                let email, websiteId;

                if (customerId) {
                    try {
                        const customer = await client.get(`V1/customers/${customerId}`);
                        email = customer.email;
                        websiteId = customer.website_id;
                        console.log(chalk.gray(`Fetched customer ${customerId}: ${email} (Website: ${websiteId})`));
                    } catch (e) {
                        throw new Error(`Customer ${customerId} not found.`);
                    }
                } else {
                    const answers = await inquirer.prompt([
                        { name: 'email', message: 'Customer Email:' },
                        { name: 'websiteId', message: 'Website ID:', default: '1' }
                    ]);
                    email = answers.email;
                    websiteId = answers.websiteId;
                }

                if (!customerId && !options.redirectUrl) {
                    const { redirectUrl } = await inquirer.prompt([
                        { name: 'redirectUrl', message: 'Redirect URL (optional):' }
                    ]);
                    options.redirectUrl = redirectUrl;
                }

                const payload = {
                    email: email,
                    websiteId: parseInt(websiteId, 10),
                    redirectUrl: options.redirectUrl || undefined
                };

                await client.post('V1/customers/confirm', payload);
                console.log(chalk.green(`✅ Confirmation email sent to ${email}`));
            } catch (e) {
                if (e.response && e.response.status === 400 && e.response.data && e.response.data.message === "Confirmation isn't needed.") {
                    console.log(chalk.yellow('ℹ️  Confirmation is not needed for this customer (already confirmed).'));
                } else {
                    handleError(e);
                }
            }
        });
    const groups = customers.command('group').description('Manage customer groups');

    groups.command('list')
        .description('List customer groups')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('V1/customerGroups/search', params);
                const rows = (data.items || []).map(g => [g.id, g.code, g.tax_class_id]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Code', 'Tax Class ID'], rows);
            } catch (e) { handleError(e); }
        });
}
