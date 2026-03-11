import { createClient } from '../api/factory.js';
import { handleError, buildSearchCriteria, formatOutput } from '../utils.js';
import chalk from 'chalk';
import { input, select, editor } from '@inquirer/prompts';

export async function restRequestAction(path, options) {
    try {
        const client = await createClient();

        let requestPath = path;
        if (!requestPath) {
            requestPath = await input({
                message: 'Enter the endpoint path (relative to base URL):',
                validate: value => value.length > 0 ? true : 'Path is required'
            });
        }

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

        let data = options.data;
        const contentType = options.contentType || 'application/json';

        if ((method === 'POST' || method === 'PUT') && data === undefined) {
            data = await editor({
                message: 'Enter request body:',
                default: contentType === 'application/json' ? '{\n  \n}' : ''
            });
        }

        let parsedData = data;
        if (contentType === 'application/json' && data && typeof data === 'string') {
            try {
                parsedData = JSON.parse(data);
            } catch {
                throw new Error('Invalid JSON data provided.');
            }
        }

        if (!options.format) {
            console.log(chalk.gray(`Executing ${method} ${requestPath}...`));
        }

        const config = {
            headers: {
                'Content-Type': contentType
            }
        };

        if (options.format === 'json') config.headers.Accept = 'application/json';
        else if (options.format === 'xml') config.headers.Accept = 'application/xml';

        const unifiedOptions = { ...options };
        if (options.pageSize) unifiedOptions.size = options.pageSize;
        if (options.currentPage) unifiedOptions.page = options.currentPage;

        const { params, addFilter } = buildSearchCriteria(unifiedOptions);

        if (options.query) {
            const searchParams = new URLSearchParams(options.query);
            for (const [key, value] of searchParams) {
                params[key] = value;
            }
        }

        if (options.sort && options.sort.length > 0) {
            let sortIndex = 0;
            for (const s of options.sort) {
                const parts = s.split(':');
                const field = parts[0];
                const direction = parts.length > 1 ? parts[1].toUpperCase() : 'ASC';

                params[`searchCriteria[sortOrders][${sortIndex}][field]`] = field;
                params[`searchCriteria[sortOrders][${sortIndex}][direction]`] = direction;
                sortIndex++;
            }
        }

        const response = await client.request(method, requestPath, parsedData, params, config);

        if (formatOutput(options, response)) {
            return;
        }

        if (typeof response === 'object') console.log(JSON.stringify(response, null, 2));
        else console.log(response);
    } catch (e) {
        handleError(e);
    }
}
