import { createClient } from '../api/factory.js';
import { handleError } from '../utils.js';
import chalk from 'chalk';
import { input, select, editor } from '@inquirer/prompts';

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
        .action(async (path, options) => {
            try {
                const client = await createClient();

                // 1. Path
                let requestPath = path;
                if (!requestPath) {
                    requestPath = await input({
                        message: 'Enter the endpoint path (relative to base URL):',
                        validate: (value) => value.length > 0 ? true : 'Path is required'
                    });
                }

                // 2. Method
                let method = options.method;
                if (!method) {
                    method = await select({
                        message: 'Select HTTP Method:',
                        choices: [
                            { name: 'GET', value: 'GET' },
                            { name: 'POST', value: 'POST' },
                            { name: 'PUT', value: 'PUT' },
                            { name: 'DELETE', value: 'DELETE' }
                        ]
                    });
                }
                method = method.toUpperCase();

                // 3. Data (Body)
                let data = options.data;
                const contentType = options.contentType || 'application/json';

                if ((method === 'POST' || method === 'PUT') && data === undefined) {
                    data = await editor({
                        message: 'Enter request body:',
                        default: contentType === 'application/json' ? '{\n  \n}' : ''
                    });
                }

                // Validate and Parse JSON
                let parsedData = data;
                if (contentType === 'application/json' && data) {
                    if (typeof data === 'string') {
                        try {
                            parsedData = JSON.parse(data);
                        } catch (e) {
                            throw new Error('Invalid JSON data provided.');
                        }
                    }
                }

                // 4. Execution
                if (!options.format) {
                    console.log(chalk.gray(`Executing ${method} ${requestPath}...`));
                }
                
                const config = {
                    headers: {
                        'Content-Type': contentType
                    }
                };

                if (options.format === 'json') {
                    config.headers['Accept'] = 'application/json';
                } else if (options.format === 'xml') {
                    config.headers['Accept'] = 'application/xml';
                }

                // Parse query options
                let params = {};
                if (options.query) {
                    const searchParams = new URLSearchParams(options.query);
                    for (const [key, value] of searchParams) {
                        params[key] = value;
                    }
                }

                if (options.pageSize) {
                    params['searchCriteria[pageSize]'] = options.pageSize;
                }

                if (options.currentPage) {
                    params['searchCriteria[currentPage]'] = options.currentPage;
                }

                const response = await client.request(method, requestPath, parsedData, params, config);

                // 5. Output
                if (options.format === 'json') {
                    // Ensure we output valid JSON even if response is already an object
                    if (typeof response === 'object') {
                        console.log(JSON.stringify(response, null, 2));
                    } else {
                        // Attempt to parse if string, otherwise output as is (or error?)
                        // Usually response.data is parsed by axios if json.
                        console.log(response);
                    }
                } else if (options.format === 'xml') {
                    console.log(response);
                } else {
                    // Default behavior
                    if (typeof response === 'object') {
                        console.log(JSON.stringify(response, null, 2));
                    } else {
                        console.log(response);
                    }
                }

            } catch (e) {
                handleError(e);
            }
        });
}
