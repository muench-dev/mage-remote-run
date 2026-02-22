import {
    paymentInfoPurchaseOrderCartAction,
    shippingMethodsPurchaseOrderCartAction,
    totalsPurchaseOrderCartAction
} from './purchase-order-cart-actions.js';

export function registerPurchaseOrderCartCommands(program) {
    const poCart = program.command('po-cart').description('Manage Purchase Order Carts');

    poCart.command('totals <cartId>')
        .description('Get purchase order cart totals')
        .action(totalsPurchaseOrderCartAction);

    poCart.command('shipping-methods <cartId>')
        .description('Estimate shipping methods (requires address ID)')
        .requiredOption('--address-id <id>', 'Address ID to estimate for')
        .action(shippingMethodsPurchaseOrderCartAction);

    poCart.command('payment-info <cartId>')
        .description('Get payment information')
        .action(paymentInfoPurchaseOrderCartAction);
}
