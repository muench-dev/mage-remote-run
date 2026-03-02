import { createClient } from '../api/factory.js';
import { printTable, handleError, buildPaginationCriteria, getFormatHeaders, formatOutput } from '../utils.js';
import chalk from 'chalk';

export async function listAttributeSetsAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const params = {
            ...buildPaginationCriteria(options)
        };
        const data = await client.get('V1/eav/attribute-sets/list', params, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        const rows = (data.items || []).map(set => [
            set.attribute_set_id,
            set.attribute_set_name,
            set.entity_type_id,
            set.sort_order
        ]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['ID', 'Name', 'Entity Type ID', 'Sort Order'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showAttributeSetAction(id, options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);
        const data = await client.get(`V1/eav/attribute-sets/${id}`, {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        console.log(chalk.bold.blue('\nAttribute Set Details:'));
        console.log(`${chalk.bold('ID:')}             ${data.attribute_set_id}`);
        console.log(`${chalk.bold('Name:')}           ${data.attribute_set_name}`);
        console.log(`${chalk.bold('Entity Type ID:')} ${data.entity_type_id}`);
        console.log(`${chalk.bold('Sort Order:')}     ${data.sort_order}`);
    } catch (e) {
        handleError(e);
    }
}
