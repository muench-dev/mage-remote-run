import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerCartCommands(program) {
    const carts = program.command('cart').description('Manage carts');

    //-------------------------------------------------------
    // "cart show" Command
    //-------------------------------------------------------
    carts.command('show <cartId>')
        .description('Show detailed cart information')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run cart show 123
  $ mage-remote-run cart show 123 --format json
`)
        .action(async (cartId, options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

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

                // General Info
                console.log(`${chalk.bold('ID:')}             ${data.id}`);
                console.log(`${chalk.bold('Status:')}         ${data.is_active ? chalk.green('Active') : chalk.gray('Inactive')}`);
                console.log(`${chalk.bold('Created At:')}     ${data.created_at || 'N/A'}`);
                console.log(`${chalk.bold('Updated At:')}     ${data.updated_at || 'N/A'}`);
                console.log(`${chalk.bold('Items Count:')}    ${data.items_count || 0}`);
                console.log(`${chalk.bold('Items Qty:')}      ${data.items_qty || 0}`);
                console.log(`${chalk.bold('Virtual:')}        ${data.is_virtual ? 'Yes' : 'No'}`);

                // Customer Info
                if (data.customer && data.customer.email) {
                    const customerName = `${data.customer.firstname || ''} ${data.customer.lastname || ''}`.trim();
                    console.log(`${chalk.bold('Customer:')}       ${customerName} <${data.customer.email}>`);
                } else {
                    console.log(`${chalk.bold('Customer:')}       Guest`);
                }

                // Totals (if available) - Fetching just for display
                let totals = null;
                try {
                    totals = await client.get(`V1/carts/${cartId}/totals`);
                    const currency = totals.quote_currency_code || '';
                    console.log(`${chalk.bold('Grand Total:')}    ${chalk.green(totals.grand_total + ' ' + currency)}`);
                } catch (e) {
                    // Ignore missing totals
                }

                console.log(chalk.gray('━'.repeat(50)));

                // Items
                if (data.items && data.items.length > 0) {
                    console.log(chalk.bold('\n📦 Items'));
                    const itemRows = data.items.map(item => [
                        item.sku,
                        item.name,
                        item.qty,
                        item.price,
                        (item.qty * item.price).toFixed(2) // Approximation as row total might not be in item directly? actually cart item usually has price.
                    ]);
                    printTable(['SKU', 'Name', 'Qty', 'Price', 'Row Total'], itemRows);
                }

                // Totals Breakdown
                if (totals) {
                    // We displayed Grand Total above.
                    // Order show doesn't list full breakdown usually, just items and grand total and addresses.
                    // But user asked for "Add ... totals there" previously.
                    // I'll keep the breakdown but make it compact or skip if Order doesn't have it.
                    // Order show has "Grand Total" in header.
                    // I will stick to the requested structure "similar to order show".
                    // Order show DOES NOT show subtotal/tax explicitly in the "Order Information" block usually, just Grand Total.
                    // But I will keep the full breakdown nicely formatted if requested.
                    // Actually, let's append it after items or before addresses.
                    // Or just skip it to strict "match order show".
                    // User said "Add the address information... and the totals there". So I MUST include totals.
                    console.log(chalk.bold('\n💰 Totals Breakdown'));
                    console.log(`  Subtotal:   ${totals.subtotal}`);
                    if (totals.tax_amount > 0) console.log(`  Tax:        ${totals.tax_amount}`);
                    if (totals.shipping_amount > 0) console.log(`  Shipping:   ${totals.shipping_amount}`);
                    if (totals.discount_amount < 0) console.log(`  Discount:   ${totals.discount_amount}`);
                    console.log(chalk.bold(`  Grand Total: ${totals.grand_total} ${totals.quote_currency_code}`));
                }

                // Addresses
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

                // Helper for address printing (inline to avoid messing with utils exports for now or duplicate)
                function printAddress(addr) {
                    if (!addr) return;

                    const name = `${addr.firstname || ''} ${addr.lastname || ''}`.trim();
                    const street = Array.isArray(addr.street) ? addr.street : (addr.street ? [addr.street] : []);

                    // Handle region: could be string, or object with region_code/region
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

            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "cart list" Command (Renamed from search)
    //-------------------------------------------------------
    carts.command('list')
        .description('List carts')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .option('--filter <filter...>', 'Filter options (e.g. "field:value:condition_type" or "field:value")', [])
        .option('--sort <sort...>', 'Sort options (e.g. "field:direction")', [])
        .addHelpText('after', `
Examples:
  $ mage-remote-run cart list
  $ mage-remote-run cart list --page 2 --size 50
  $ mage-remote-run cart list --filter "is_active:1"
  $ mage-remote-run cart list --sort "created_at:DESC"
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                let params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };

                // Process filters
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

                // Process sorting
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

            } catch (e) { handleError(e); }
        });
}
