import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria } from '../utils.js';
import chalk from 'chalk';

export async function listTaxClassesAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const params = {
            ...buildPaginationCriteria(options)
        };
        const data = await client.get('V1/taxClasses/search', params, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        const rows = (data.items || []).map(tc => [
            tc.class_id,
            tc.class_name,
            tc.class_type
        ]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Name', 'Type'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showTaxClassAction(id) {
    try {
        const client = await createClient();
        const data = await client.get(`V1/taxClasses/${id}`);

        console.log(chalk.bold.blue('\nTax Class Details:'));
        console.log(`${chalk.bold('ID:')}   ${data.class_id}`);
        console.log(`${chalk.bold('Name:')} ${data.class_name}`);
        console.log(`${chalk.bold('Type:')} ${data.class_type}`);
    } catch (e) {
        handleError(e);
    }
}
