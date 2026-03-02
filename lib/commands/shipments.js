import {
  addShipmentTrackAction,
  createShipmentAction,
  listShipmentsAction,
  shipmentCommentAction,
  shipmentEmailAction,
  shipmentLabelAction,
  showShipmentAction
} from './shipments-actions.js';

import { addPaginationOptions } from '../utils.js';

export function registerShipmentCommands(program) {
  const shipments = program.command('shipment').description('Manage shipments');

  addPaginationOptions(shipments.command('list')
    .description('List shipments'))
    .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
    .option('--order-id <id>', 'Filter by Order ID')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment list
  $ mage-remote-run shipment list --page 1 --size 10
  $ mage-remote-run shipment list --format json
  $ mage-remote-run shipment list --order-id 123
`)
    .action(listShipmentsAction);

  shipments.command('show <id>')
    .description('Show shipment details')
    .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment show 123
`)
    .action(showShipmentAction);

  shipments.command('create <orderId>')
    .description('Create shipment for an order')
    .option('--notify', 'Notify customer via email')
    .option('--append-comment', 'Append comment')
    .option('--comment <text>', 'Comment text')
    .option('--visible', 'Comment visible on frontend')
    .option('--tracks <json>', 'Tracks array JSON string')
    .option('--items <json>', 'Items array JSON string (if partial shipment)')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment create 123 --notify
  $ mage-remote-run shipment create 123 --tracks '[{"carrier_code":"fedex","title":"FedEx","track_number":"123456"}]'
`)
    .action(createShipmentAction);

  shipments.command('label <id>')
    .description('Retrieve shipping label')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment label 123
`)
    .action(shipmentLabelAction);

  shipments.command('track <id>')
    .description('Add tracking number to shipment')
    .requiredOption('--carrier <code>', 'Carrier code')
    .requiredOption('--title <title>', 'Carrier title')
    .requiredOption('--number <number>', 'Tracking number')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment track 123 --carrier fedex --title FedEx --number 987654321
`)
    .action(addShipmentTrackAction);

  shipments.command('email <id>')
    .description('Send shipment email')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment email 123
`)
    .action(shipmentEmailAction);

  shipments.command('comments <id>')
    .description('Add comment to shipment')
    .requiredOption('--comment <text>', 'Comment text')
    .option('--visible', 'Visible on frontend')
    .option('--notify', 'Notify customer')
    .addHelpText('after', `
Examples:
  $ mage-remote-run shipment comments 123 --comment "Package is on the way" --notify
`)
    .action(shipmentCommentAction);
}
