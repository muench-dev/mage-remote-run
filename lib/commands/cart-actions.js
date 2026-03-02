import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria } from '../utils.js';
import chalk from 'chalk';

function printAddress(addr) {
    if (!addr) return;

    const name = `${addr.firstname || ''} ${addr.lastname || ''}`.trim();
    const street = Array.isArray(addr.street) ? addr.street : (addr.street ? [addr.street] : []);

    let region = addr.region || addr.region_code || '';
    if (typeof region === 'object') {
        region = region.region_code || region.region || '';
    }

    const cityParts = [
        addr.city,
        region,
        addr.postcode
    ].filter(Boolean);

    const lines = [
        name,
        ...street,
        cityParts.length > 0 ? cityParts.join(', ') : null,
        addr.country_id,
        addr.telephone ? `T: ${addr.telephone}` : null
    ].filter(Boolean);

    if (lines.length === 0) console.log(chalk.gray('  (Empty Address)'));
    else lines.forEach(l => console.log(`  ${l}`));
}

export async function showCartAction(cartId, options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const data = await client.get(`V1/carts/${cartId}`, {}, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        console.log(chalk.bold.blue('\n🛒 Cart Information'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log(`${chalk.bold('ID:')}             ${data.id}`);
        console.log(`${chalk.bold('Status:')}         ${data.is_active ? chalk.green('Active') : chalk.gray('Inactive')}`);
        console.log(`${chalk.bold('Created At:')}     ${data.created_at || 'N/A'}`);
        console.log(`${chalk.bold('Updated At:')}     ${data.updated_at || 'N/A'}`);
        console.log(`${chalk.bold('Items Count:')}    ${data.items_count || 0}`);
        console.log(`${chalk.bold('Items Qty:')}      ${data.items_qty || 0}`);
        console.log(`${chalk.bold('Virtual:')}        ${data.is_virtual ? 'Yes' : 'No'}`);

        if (data.customer && data.customer.email) {
            const customerName = `${data.customer.firstname || ''} ${data.customer.lastname || ''}`.trim();
            console.log(`${chalk.bold('Customer:')}       ${customerName} <${data.customer.email}>`);
        } else {
            console.log(`${chalk.bold('Customer:')}       Guest`);
        }

        let totals = null;
        try {
            totals = await client.get(`V1/carts/${cartId}/totals`);
            const currency = totals.quote_currency_code || '';
            console.log(`${chalk.bold('Grand Total:')}    ${chalk.green(totals.grand_total + ' ' + currency)}`);
        } catch {
            // ignore missing totals
        }

        console.log(chalk.gray('━'.repeat(50)));

        if (data.items && data.items.length > 0) {
            console.log(chalk.bold('\n📦 Items'));
            const itemRows = data.items.map(item => [
                item.sku,
                item.name,
                item.qty,
                item.price,
                (item.qty * item.price).toFixed(2)
            ]);
            printTable(['SKU', 'Name', 'Qty', 'Price', 'Row Total'], itemRows);
        }

        if (totals) {
            console.log(chalk.bold('\n💰 Totals Breakdown'));
            console.log(`  Subtotal:   ${totals.subtotal}`);
            if (totals.tax_amount > 0) console.log(`  Tax:        ${totals.tax_amount}`);
            if (totals.shipping_amount > 0) console.log(`  Shipping:   ${totals.shipping_amount}`);
            if (totals.discount_amount < 0) console.log(`  Discount:   ${totals.discount_amount}`);
            console.log(chalk.bold(`  Grand Total: ${totals.grand_total} ${totals.quote_currency_code}`));
        }

        if (data.billing_address || (data.extension_attributes && data.extension_attributes.shipping_assignments)) {
            console.log(chalk.bold('\n📍 Addresses'));

            if (data.billing_address) {
                console.log(chalk.bold.underline('Billing Address:'));
                printAddress(data.billing_address);
            }

            if (data.extension_attributes && data.extension_attributes.shipping_assignments) {
                data.extension_attributes.shipping_assignments.forEach((assignment, idx) => {
                    if (assignment.shipping && assignment.shipping.address) {
                        console.log(chalk.bold.underline(idx === 0 ? '\nShipping Address:' : `\nShipping Address (${idx + 1}):`));
                        printAddress(assignment.shipping.address);
                        if (assignment.shipping.method) {
                            console.log(chalk.gray(`Method: ${assignment.shipping.method}`));
                        }
                    }
                });
            }
        }
    } catch (e) {
        handleError(e);
    }
}

export async function listCartsAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const params = {
            ...buildPaginationCriteria(options)
        };

        if (options.filter && options.filter.length > 0) {
            options.filter.forEach((f, idx) => {
                const parts = f.split(':');
                const field = parts[0];
                const value = parts[1];
                const condition = parts[2] || 'eq';

                params[`searchCriteria[filter_groups][${idx}][filters][0][field]`] = field;
                params[`searchCriteria[filter_groups][${idx}][filters][0][value]`] = value;
                params[`searchCriteria[filter_groups][${idx}][filters][0][condition_type]`] = condition;
            });
        }

        if (options.sort && options.sort.length > 0) {
            options.sort.forEach((s, idx) => {
                const parts = s.split(':');
                const field = parts[0];
                const direction = parts[1] || 'ASC';

                params[`searchCriteria[sortOrders][${idx}][field]`] = field;
                params[`searchCriteria[sortOrders][${idx}][direction]`] = direction;
            });
        }

        const data = await client.get('V1/carts/search', params, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        const rows = (data.items || []).map(c => [
            c.id,
            c.customer ? c.customer.email : 'Guest',
            c.is_active ? 'Yes' : 'No',
            c.items_qty || 0,
            c.created_at
        ]);

        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Customer', 'Active', 'Qty', 'Created'], rows);
    } catch (e) {
        handleError(e);
    }
}
