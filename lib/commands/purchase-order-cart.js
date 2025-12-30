import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerPurchaseOrderCartCommands(program) {
    const poCart = program.command('po-cart').description('Manage Purchase Order Carts');

    //-------------------------------------------------------
    // "po-cart totals" Command
    //-------------------------------------------------------
    poCart.command('totals <cartId>')
        .description('Get purchase order cart totals')
        .action(async (cartId) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/purchase-order-carts/${cartId}/totals`);

                console.log(chalk.bold('Totals:'));
                const rows = (data.total_segments || []).map(t => [t.title, t.value]);
                printTable(['Title', 'Value'], rows);

                console.log(chalk.bold(`\nGrand Total: ${data.grand_total} ${data.quote_currency_code}`));
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "po-cart shipping-methods" Command
    //-------------------------------------------------------
    poCart.command('shipping-methods <cartId>')
        .description('Estimate shipping methods (requires address ID)')
        .requiredOption('--address-id <id>', 'Address ID to estimate for')
        .action(async (cartId, options) => {
            try {
                const client = await createClient();
                const payload = { addressId: options.addressId };
                const data = await client.post(`V1/purchase-order-carts/${cartId}/estimate-shipping-methods-by-address-id`, payload);

                console.log(chalk.bold('Shipping Methods:'));
                const rows = data.map(m => [m.carrier_title, m.method_title, m.amount, m.price_excl_tax]);
                printTable(['Carrier', 'Method', 'Amount', 'Price Excl Tax'], rows);
            } catch (e) { handleError(e); }
        });

    //-------------------------------------------------------
    // "po-cart payment-info" Command
    //-------------------------------------------------------
    poCart.command('payment-info <cartId>')
        .description('Get payment information')
        .action(async (cartId) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/purchase-order-carts/${cartId}/payment-information`);

                console.log(chalk.bold('Payment Methods:'));
                const methods = data.payment_methods || [];
                methods.forEach(m => console.log(`- ${m.title} (${m.code})`));

                console.log(chalk.bold('\nTotals:'));
                const totals = data.totals || {};
                console.log(`Grand Total: ${totals.grand_total} ${totals.quote_currency_code}`);
            } catch (e) { handleError(e); }
        });
}
