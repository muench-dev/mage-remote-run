import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';

export async function listTaxClassesAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const params = {
            ...buildPaginationCriteria(options)
        };
        const data = await client.get('V1/taxClasses/search', params, { headers });

        if (formatOutput(options, data)) {
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

export async function showTaxClassAction(id, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);
        const data = await client.get(`V1/taxClasses/${id}`, {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }


        console.log(chalk.bold.blue('\nTax Class Details:'));
        console.log(`${chalk.bold('ID:')}   ${data.class_id}`);
        console.log(`${chalk.bold('Name:')} ${data.class_name}`);
        console.log(`${chalk.bold('Type:')} ${data.class_type}`);
    } catch (e) {
        handleError(e);
    }
}
