import { restRequestAction } from './rest-actions.js';
import { addFormatOption } from '../utils.js';

export function registerRestCommands(program) {
  addFormatOption(program.command('rest [path]')
    .description('Execute a manual REST API request')
    .option('-m, --method <method>', 'HTTP Method (GET, POST, PUT, DELETE)')
    .option('-d, --data <data>', 'Request body data (JSON)')
    .option('-q, --query <string>', 'Query parameters (e.g. "a=1&b=2")')
    .option('-s, --size <number>', 'Search Criteria Page Size', '20')
    .option('--page-size <number>', 'Search Criteria Page Size (alias for --size)')
    .option('-p, --page <number>', 'Search Criteria Current Page', '1')
    .option('--current-page <number>', 'Search Criteria Current Page (alias for --page)')
    .option('--filter <filters...>', 'Generic filters (e.g. status=pending)')
    .option('--sort <sorts...>', 'Sort orders by field and direction (e.g., "sku:DESC", "created_at:ASC")')
    .option('-c, --content-type <type>', 'Content-Type', 'application/json'))
    .addHelpText('after', `
Examples:
  $ mage-remote-run rest V1/store/websites
  $ mage-remote-run rest V1/customers/1 -m GET
  $ mage-remote-run rest V1/customers -m POST -d '{"customer": {"email": "test@example.com", ...}}'
  $ mage-remote-run rest V1/products -m GET -q "searchCriteria[pageSize]=10&fields=items[sku,name]"
  $ mage-remote-run rest V1/products -m GET --page-size 10 --current-page 1
`)
    .action(restRequestAction);
}
