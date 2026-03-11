import { createClient } from '../api/factory.js';
import {
    printTable, handleError, buildPaginationCriteria,
    getFormatHeaders, formatOutput, buildSearchCriteria, buildSortCriteria
} from '../utils.js';
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
        const headers = getFormatHeaders(options);

        const data = await client.get(`V1/carts/${cartId}`, {}, { headers });

        if (formatOutput(options, data)) {
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
        const headers = getFormatHeaders(options);

        const { params: filterParams } = buildSearchCriteria(options);
        const { params: sortParams } = buildSortCriteria(options);

        const params = {
            ...buildPaginationCriteria(options),
            ...filterParams,
            ...sortParams
        };

        const data = await client.get('V1/carts/search', params, { headers });

        if (formatOutput(options, data)) {
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
