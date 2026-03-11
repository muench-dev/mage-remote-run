import { createClient } from '../api/factory.js';
import { printTable, handleError, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';

export async function totalsPurchaseOrderCartAction(cartId, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);
        const data = await client.get(`V1/purchase-order-carts/${cartId}/totals`, {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }


        console.log(chalk.bold('Totals:'));
        const rows = (data.total_segments || []).map(t => [t.title, t.value]);
        printTable(['Title', 'Value'], rows);

        console.log(chalk.bold(`\nGrand Total: ${data.grand_total} ${data.quote_currency_code}`));
    } catch (e) {
        handleError(e);
    }
}

export async function shippingMethodsPurchaseOrderCartAction(cartId, options) {
    try {
        const client = await createClient();
        const payload = { addressId: options.addressId };
        const headers = getFormatHeaders(options);
        const data = await client.post(`V1/purchase-order-carts/${cartId}/estimate-shipping-methods-by-address-id`, payload, { headers });

        if (formatOutput(options, data)) {
            return;
        }


        console.log(chalk.bold('Shipping Methods:'));
        const rows = data.map(m => [m.carrier_title, m.method_title, m.amount, m.price_excl_tax]);
        printTable(['Carrier', 'Method', 'Amount', 'Price Excl Tax'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function paymentInfoPurchaseOrderCartAction(cartId, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);
        const data = await client.get(`V1/purchase-order-carts/${cartId}/payment-information`, {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }


        console.log(chalk.bold('Payment Methods:'));
        const methods = data.payment_methods || [];
        methods.forEach(m => console.log(`- ${m.title} (${m.code})`));

        console.log(chalk.bold('\nTotals:'));
        const totals = data.totals || {};
        console.log(`Grand Total: ${totals.grand_total} ${totals.quote_currency_code}`);
    } catch (e) {
        handleError(e);
    }
}
