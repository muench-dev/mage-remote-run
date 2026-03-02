import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export async function listCustomersAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const params = {
            ...buildPaginationCriteria(options)
        };
        const data = await client.get('V1/customers/search', params, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        const rows = (data.items || []).map(c => [c.id, c.email, c.firstname, c.lastname, c.group_id]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Email', 'First Name', 'Last Name', 'Group ID'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function searchCustomersAction(query) {
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
    } catch (e) {
        handleError(e);
    }
}

export async function createCustomerAction() {
    try {
        const client = await createClient();
        const answers = await inquirer.prompt([
            { name: 'firstname', message: 'First Name:' },
            { name: 'lastname', message: 'Last Name:' },
            { name: 'email', message: 'Email:' },
            { name: 'password', message: 'Password:', type: 'password' }
        ]);

        const payload = {
            customer: {
                email: answers.email,
                firstname: answers.firstname,
                lastname: answers.lastname
            },
            password: answers.password
        };

        const data = await client.post('V1/customers', payload);
        console.log(chalk.green(`✅ Customer created with ID: ${data.id}`));
    } catch (e) {
        handleError(e);
    }
}

export async function editCustomerAction(id) {
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
    } catch (e) {
        handleError(e);
    }
}

export async function showCustomerAction(customerId, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const data = await client.get(`V1/customers/${customerId}`, {}, { headers });

        if (formatOutput(options, data)) {
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
    } catch (e) {
        handleError(e);
    }
}

export async function deleteCustomerAction(customerId, options) {
    try {
        if (!options.force) {
            const answer = await inquirer.prompt([{
                type: 'confirm',
                name: 'confirm',
                message: `Are you sure you want to delete customer ${customerId}?`,
                default: false
            }]);
            if (!answer.confirm) {
                console.log('Operation cancelled.');
                return;
            }
        }

        const client = await createClient();
        await client.delete(`V1/customers/${customerId}`);
        console.log(chalk.green(`✅ Customer ${customerId} deleted.`));
    } catch (e) {
        handleError(e);
    }
}

export async function confirmCustomerAction(customerId, options) {
    try {
        const client = await createClient();
        let email;
        let websiteId;

        if (customerId) {
            try {
                const customer = await client.get(`V1/customers/${customerId}`);
                email = customer.email;
                websiteId = customer.website_id;
                console.log(chalk.gray(`Fetched customer ${customerId}: ${email} (Website: ${websiteId})`));
            } catch {
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

        const payload = {
            email,
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
}

export async function listCustomerGroupsAction(options) {
    try {
        const client = await createClient();
        const params = {
            ...buildPaginationCriteria(options)
        };
        const data = await client.get('V1/customerGroups/search', params);
        const rows = (data.items || []).map(g => [g.id, g.code, g.tax_class_id]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Code', 'Tax Class ID'], rows);
    } catch (e) {
        handleError(e);
    }
}
