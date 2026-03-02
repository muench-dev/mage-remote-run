import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria } from '../utils.js';
import chalk from 'chalk';

export async function listShipmentsAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const params = {
            ...buildPaginationCriteria(options)
        };

        if (options.orderId) {
            params['searchCriteria[filter_groups][0][filters][0][field]'] = 'order_id';
            params['searchCriteria[filter_groups][0][filters][0][value]'] = options.orderId;
            params['searchCriteria[filter_groups][0][filters][0][condition_type]'] = 'eq';
        }

        const data = await client.get('V1/shipments', params, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        const rows = (data.items || []).map(s => [
            s.entity_id,
            s.increment_id,
            s.order_id,
            s.total_qty,
            s.created_at
        ]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Increment ID', 'Order ID', 'Total Qty', 'Created At'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showShipmentAction(id, options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        let shipment;
        try {
            shipment = await client.get(`V1/shipment/${id}`, {}, { headers });
        } catch (e) {
            const params = {
                'searchCriteria[filter_groups][0][filters][0][field]': 'increment_id',
                'searchCriteria[filter_groups][0][filters][0][value]': id,
                'searchCriteria[filter_groups][0][filters][0][condition_type]': 'eq'
            };
            const searchData = await client.get('V1/shipments', params);

            if (searchData.items && searchData.items.length > 0) {
                shipment = searchData.items[0];
                if (options.format === 'xml') {
                    shipment = await client.get(`V1/shipment/${shipment.entity_id}`, {}, { headers });
                }
            } else {
                if (e.response && e.response.status === 404) {
                    throw new Error(`Shipment ${id} not found.`);
                }
                throw e;
            }
        }

        if (options.format === 'json') {
            console.log(JSON.stringify(shipment, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(shipment);
            return;
        }

        console.log(chalk.bold.blue('\n📦 Shipment Information'));
        console.log(chalk.gray('━'.repeat(50)));
        console.log(`${chalk.bold('ID:')}             ${shipment.entity_id}`);
        console.log(`${chalk.bold('Increment ID:')}   ${shipment.increment_id}`);
        console.log(`${chalk.bold('Order ID:')}       ${shipment.order_id}`);
        console.log(`${chalk.bold('Total Qty:')}      ${shipment.total_qty}`);
        console.log(`${chalk.bold('Created At:')}     ${shipment.created_at}`);

        if (shipment.items && shipment.items.length > 0) {
            console.log(chalk.bold('\n🛒 Items'));
            const itemRows = shipment.items.map(item => [
                item.sku,
                item.name,
                Math.floor(item.qty),
                item.price
            ]);
            printTable(['SKU', 'Name', 'Qty', 'Price'], itemRows);
        }

        if (shipment.tracks && shipment.tracks.length > 0) {
            console.log(chalk.bold('\n🚚 Tracking'));
            const trackRows = shipment.tracks.map(track => [
                track.title,
                track.carrier_code,
                track.track_number
            ]);
            printTable(['Title', 'Carrier', 'Number'], trackRows);
        }

        if (shipment.comments && shipment.comments.length > 0) {
            console.log(chalk.bold('\n💬 Comments'));
            const commentRows = shipment.comments.map(c => [
                c.created_at,
                c.comment
            ]);
            printTable(['Date', 'Comment'], commentRows);
        }
    } catch (e) {
        handleError(e);
    }
}

export async function createShipmentAction(orderId, options) {
    try {
        const client = await createClient();
        const payload = {
            notify: !!options.notify,
            appendComment: !!options.appendComment,
            comment: {
                extension_attributes: {},
                comment: options.comment || '',
                is_visible_on_front: options.visible ? 1 : 0
            }
        };

        if (options.tracks) payload.tracks = JSON.parse(options.tracks);
        if (options.items) payload.items = JSON.parse(options.items);

        const result = await client.post(`V1/order/${orderId}/ship`, payload);
        console.log(chalk.green(`Shipment created. ID: ${result}`));
    } catch (e) {
        handleError(e);
    }
}

export async function shipmentLabelAction(id) {
    try {
        const client = await createClient();
        const label = await client.get(`V1/shipment/${id}/label`);
        if (label) console.log(label);
        else console.log(chalk.yellow('No label found.'));
    } catch (e) {
        handleError(e);
    }
}

export async function addShipmentTrackAction(id, options) {
    try {
        const client = await createClient();
        const payload = {
            entity: {
                order_id: null,
                parent_id: id,
                carrier_code: options.carrier,
                title: options.title,
                track_number: options.number
            }
        };

        const result = await client.post('V1/shipment/track', payload);
        console.log(chalk.green(`Tracking added. ID: ${result}`));
    } catch (e) {
        handleError(e);
    }
}

export async function shipmentEmailAction(id) {
    try {
        const client = await createClient();
        const result = await client.post(`V1/shipment/${id}/emails`);
        if (result) console.log(chalk.green('Email sent.'));
        else console.log(chalk.green('Email sent signal processed.'));
    } catch (e) {
        handleError(e);
    }
}

export async function shipmentCommentAction(id, options) {
    try {
        const client = await createClient();
        const payload = {
            entity: {
                parent_id: id,
                comment: options.comment,
                is_visible_on_front: options.visible ? 1 : 0,
                is_customer_notified: options.notify ? 1 : 0
            }
        };

        const result = await client.post(`V1/shipment/${id}/comments`, payload);
        console.log(chalk.green(`Comment added. ID: ${result.entity_id || result}`));
    } catch (e) {
        handleError(e);
    }
}
