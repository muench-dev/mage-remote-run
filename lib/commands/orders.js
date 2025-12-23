import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerOrdersCommands(program) {
    const orders = program.command('order').description('Manage orders');

    orders.command('list')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('V1/orders', params, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                const rows = (data.items || []).map(o => [o.entity_id, o.increment_id, o.status, o.grand_total, o.customer_email]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Increment ID', 'Status', 'Total', 'Email'], rows);
            } catch (e) { handleError(e); }
        });

    orders.command('search <query>')
        .description('Search orders by Increment ID')
        .action(async (query) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
                    'searchCriteria[filter_groups][0][filters][0][value]': `%${query}%`,
                    'searchCriteria[filter_groups][0][filters][0][condition_type]': 'like'
                };
                const data = await client.get('V1/orders', params);
                const rows = (data.items || []).map(o => [o.entity_id, o.increment_id, o.status, o.grand_total]);
                printTable(['ID', 'Increment ID', 'Status', 'Total'], rows);
            } catch (e) { handleError(e); }
        });

    orders.command('edit <id>')
        .description('Update order status (via Comment)')
        .action(async (id) => {
            try {
                const client = await createClient();
                // Check if order exists?
                // Just ask for status
                const answers = await inquirer.prompt([
                    { name: 'status', message: 'New Status Code (e.g. pending, processing):' },
                    { name: 'comment', message: 'Comment:' }
                ]);

                // POST /V1/orders/:id/comments
                await client.post(`V1/orders/${id}/comments`, {
                    statusHistory: {
                        comment: answers.comment,
                        status: answers.status,
                        is_customer_notified: 0,
                        is_visible_on_front: 0
                    }
                });
                console.log(chalk.green(`Order ${id} updated.`));
            } catch (e) { handleError(e); }
        });
    orders.command('show <identifier>')
        .description('Show detailed order information by ID or Increment ID')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .action(async (identifier, options) => {
            try {
                await showOrder(identifier, options.format);
            } catch (e) { handleError(e); }
        });

    orders.command('latest')
        .description('List latest orders sorted by created_at DESC with selection')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-z, --size <number>', 'Page size', '20')
        .option('-s, --select', 'Interactive selection mode')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[pageSize]': options.size,
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[sortOrders][0][field]': 'created_at',
                    'searchCriteria[sortOrders][0][direction]': 'DESC'
                };
                const data = await client.get('V1/orders', params);
                const items = data.items || [];

                if (items.length === 0) {
                    console.log('No orders found.');
                    return;
                }

                const rows = (data.items || []).map(o => [o.entity_id, o.increment_id, o.status, o.grand_total, o.created_at]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Increment ID', 'Status', 'Total', 'Created At'], rows);

                if (options.select) {
                    // Interactive selection
                    const choices = items.map(o => ({
                        name: `${o.increment_id} (ID: ${o.entity_id})`,
                        value: o.entity_id
                    }));

                    // Add exit option
                    choices.push({ name: 'Exit', value: null });

                    const { orderId } = await inquirer.prompt([{
                        type: 'list',
                        name: 'orderId',
                        message: `Select an order to view details (Page ${options.page}):`,
                        choices,
                        pageSize: 15
                    }]);

                    if (orderId) {
                        await showOrder(orderId, 'text');
                    }
                }
            } catch (e) { handleError(e); }
        });
}

async function showOrder(identifier, format = 'text') {
    const { createClient } = await import('../api/factory.js');
    const { printTable } = await import('../utils.js');
    const chalk = (await import('chalk')).default;
    const client = await createClient();

    let order;

    // Map format to Accept header
    let headers = {};
    if (format === 'json') {
        headers['Accept'] = 'application/json';
    } else if (format === 'xml') {
        headers['Accept'] = 'application/xml';
    }

    try {
        order = await client.get(`V1/orders/${identifier}`, {}, { headers });
    } catch (e) {
        // If 404, maybe it was an increment ID
        // Or if user provided something that is definitely an increment ID
        const params = {
            'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
            'searchCriteria[filter_groups][0][filters][0][value]': identifier,
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq'
        };
        const searchData = await client.get('V1/orders', params);
        if (searchData.items && searchData.items.length > 0) {
            order = searchData.items[0];
            // If format is specific, we might want to re-fetch by ID with headers if search didn't return format?
            // Search API usually returns JSON. If user wants XML, search return helps find ID, then we fetch XML.
            if (format !== 'text') {
                try {
                    order = await client.get(`V1/orders/${order.entity_id}`, {}, { headers });
                } catch (subError) {
                    // ignore or log? If we fail to get formatted, fallback or throw?
                    // If we found it via search, 'order' is the object. 
                    // If format is json, we are good.
                    // If format is xml, we NEED to re-fetch because 'order' is currently a JS object from JSON response.
                    if (format === 'xml') throw subError;
                }
            }
        } else {
            throw new Error(`Order '${identifier}' not found.`);
        }
    }

    if (format === 'xml') {
        console.log(order); // Axios likely returns the XML string body
        return;
    }

    if (format === 'json') {
        // order is likely an object parsed by axios (if content-type was json)
        console.log(JSON.stringify(order, null, 2));
        return;
    }

    if (!order) throw new Error('Order not found');

    const currency = order.order_currency_code || '';

    console.log(chalk.bold.blue('\n📦 Order Information'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`${chalk.bold('Increment ID:')}   ${order.increment_id}`);
    console.log(`${chalk.bold('Internal ID:')}    ${order.entity_id}`);
    console.log(`${chalk.bold('Status:')}         ${statusColor(order.status)} (${order.state})`);
    console.log(`${chalk.bold('Created At:')}     ${order.created_at}`);
    console.log(`${chalk.bold('Customer:')}       ${order.customer_firstname} ${order.customer_lastname} <${order.customer_email}>`);
    console.log(`${chalk.bold('Grand Total:')}    ${chalk.green(order.grand_total + ' ' + currency)}`);
    console.log(chalk.gray('━'.repeat(50)));

    if (order.items && order.items.length > 0) {
        console.log(chalk.bold('\n🛒 Items'));
        const itemRows = order.items.map(item => [
            item.sku,
            item.name,
            Math.floor(item.qty_ordered),
            `${item.price} ${currency}`,
            `${item.row_total} ${currency}`
        ]);
        printTable(['SKU', 'Name', 'Qty', 'Price', 'Subtotal'], itemRows);
    }

    if (order.billing_address || order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address) {
        console.log(chalk.bold('\n📍 Addresses'));

        if (order.billing_address) {
            console.log(chalk.bold.underline('Billing Address:'));
            printAddress(order.billing_address);
        }

        const shippingAddress = order.extension_attributes?.shipping_assignments?.[0]?.shipping?.address;
        if (shippingAddress) {
            console.log(chalk.bold.underline('\nShipping Address:'));
            printAddress(shippingAddress);
        }
    }
}

function statusColor(status) {
    // Basic color coding
    if (['pending'].includes(status)) return status;
    if (['processing'].includes(status)) return status;
    if (['complete'].includes(status)) return status; // green? 
    // Since we don't have direct chalk access in this helper easily without passing it, 
    // and I don't want to import it again if I can avoid it or I can just return string.
    // Actually, I can import properly in module scope if I change top imports but I am overwriting the file so I can add imports.
    return status;
}

function printAddress(addr) {
    const lines = [
        `${addr.firstname} ${addr.lastname}`,
        ...(addr.street || []),
        `${addr.city}, ${addr.region || ''} ${addr.postcode}`,
        addr.country_id,
        addr.telephone ? `T: ${addr.telephone}` : null
    ].filter(Boolean);
    console.log(lines.join('\n'));
}
