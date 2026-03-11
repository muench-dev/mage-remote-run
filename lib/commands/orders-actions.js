import { createClient } from '../api/factory.js';
import { printTable, handleError, buildSearchCriteria, buildSortCriteria, buildPaginationCriteria, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

function statusColor(status) {
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

export async function showOrderAction(identifier, options) {
    try {
        await showOrder(identifier, options.format);
    } catch (e) {
        handleError(e);
    }
}

export async function listOrdersAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const { params, addFilter } = buildSearchCriteria(options);
        Object.assign(params, buildSortCriteria(options).params);

        if (options.status) {
            addFilter('status', options.status);
        }
        if (options.email) {
            addFilter('customer_email', options.email);
        }
        if (options.store) {
            addFilter('store_id', options.store);
        }
        if (options.dateFrom) {
            addFilter('created_at', options.dateFrom, 'gteq');
        }
        if (options.dateTo) {
            addFilter('created_at', options.dateTo, 'lteq');
        }
        // buildSearchCriteria already handles options.filter

        const data = await client.get('V1/orders', params, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        let listHeaders = [];
        let rowFieldsArray = [];

        if (options.fields) {
            rowFieldsArray = options.fields.split(',').map(f => f.trim());
            // Create nice looking headers by capitalizing and replacing underscores with spaces if needed
            // But usually just using the field name is fine or keeping it as user gave it.
            listHeaders = [...rowFieldsArray];
        } else {
            listHeaders = ['ID', 'Increment ID', 'Status', 'Total', 'Email'];
            rowFieldsArray = ['entity_id', 'increment_id', 'status', 'grand_total', 'customer_email'];
            if (options.addFields) {
                const customFields = options.addFields.split(',').map(f => f.trim());
                rowFieldsArray.push(...customFields);
                listHeaders.push(...customFields);
            }
        }

        const resolvePath = (obj, path) => path.split('.').reduce((o, p) => (o ? o[p] : ''), obj);

        const rows = (data.items || []).map(o => {
            const row = [];
            for (const field of rowFieldsArray) {
                const val = resolvePath(o, field);
                row.push(val !== undefined && val !== null ? val : '');
            }
            return row;
        });

        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(listHeaders, rows);
    } catch (e) {
        handleError(e);
    }
}

export async function searchOrdersAction(query) {
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
    } catch (e) {
        handleError(e);
    }
}

export async function editOrderAction(id) {
    try {
        const client = await createClient();
        const answers = await inquirer.prompt([
            { name: 'status', message: 'New Status Code (e.g. pending, processing):' },
            { name: 'comment', message: 'Comment:' }
        ]);

        await client.post(`V1/orders/${id}/comments`, {
            statusHistory: {
                comment: answers.comment,
                status: answers.status,
                is_customer_notified: 0,
                is_visible_on_front: 0
            }
        });
        console.log(chalk.green(`Order ${id} updated.`));
    } catch (e) {
        handleError(e);
    }
}

export async function cancelOrderAction(id) {
    try {
        const client = await createClient();
        await client.post(`V1/orders/${id}/cancel`);
        console.log(chalk.green(`Order ${id} cancelled.`));
    } catch (e) {
        handleError(e);
    }
}

export async function holdOrderAction(id) {
    try {
        const client = await createClient();
        await client.post(`V1/orders/${id}/hold`);
        console.log(chalk.green(`Order ${id} put on hold.`));
    } catch (e) {
        handleError(e);
    }
}

export async function unholdOrderAction(id) {
    try {
        const client = await createClient();
        await client.post(`V1/orders/${id}/unhold`);
        console.log(chalk.green(`Order ${id} released from hold.`));
    } catch (e) {
        handleError(e);
    }
}

export async function latestOrdersAction(options) {
    try {
        const client = await createClient();
        const params = {
            ...buildPaginationCriteria(options),
            'searchCriteria[sortOrders][0][field]': 'created_at',
            'searchCriteria[sortOrders][0][direction]': 'DESC'
        };
        const data = await client.get('V1/orders', params);
        const items = data.items || [];

        if (items.length === 0) {
            console.log('No orders found.');
            return;
        }

        const rows = items.map(o => [o.entity_id, o.increment_id, o.status, o.grand_total, o.created_at]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Increment ID', 'Status', 'Total', 'Created At'], rows);

        if (options.select) {
            const choices = items.map(o => ({
                name: `${o.increment_id} (ID: ${o.entity_id})`,
                value: o.entity_id
            }));
            choices.push({ name: 'Exit', value: null });

            const answer = await inquirer.prompt([{
                type: 'list',
                name: 'orderId',
                message: `Select an order to view details (Page ${options.page}):`,
                choices,
                pageSize: 15
            }]);

            if (answer.orderId) {
                await showOrder(answer.orderId, 'text');
            }
        }
    } catch (e) {
        handleError(e);
    }
}

async function showOrder(identifier, format = 'text') {
    const client = await createClient();
    let order;

    const headers = getFormatHeaders({ format });

    try {
        order = await client.get(`V1/orders/${identifier}`, {}, { headers });
    } catch {
        const params = {
            'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
            'searchCriteria[filter_groups][0][filters][0][value]': identifier,
            'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq'
        };
        const searchData = await client.get('V1/orders', params);
        if (searchData.items && searchData.items.length > 0) {
            order = searchData.items[0];
            if (format !== 'text') {
                try {
                    order = await client.get(`V1/orders/${order.entity_id}`, {}, { headers });
                } catch (subError) {
                    if (format === 'xml') throw subError;
                }
            }
        } else {
            throw new Error(`Order '${identifier}' not found.`);
        }
    }

    if (formatOutput({ format }, order)) {
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
