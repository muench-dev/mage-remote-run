import { restRequestAction } from './rest-actions.js';

export function registerRestCommands(program) {
    program.command('rest [path]')
        .description('Execute a manual REST API request')
        .option('-m, --method <method>', 'HTTP Method (GET, POST, PUT, DELETE)')
        .option('-d, --data <data>', 'Request body data (JSON)')
        .option('-q, --query <string>', 'Query parameters (e.g. "a=1&b=2")')
        .option('--page-size <number>', 'Search Criteria Page Size')
        .option('--current-page <number>', 'Search Criteria Current Page')
        .option('-c, --content-type <type>', 'Content-Type', 'application/json')
        .option('-f, --format <type>', 'Output format (json, xml)')
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
