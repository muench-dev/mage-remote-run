import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export async function listAttributeSetsAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const params = {
            'searchCriteria[currentPage]': options.page,
            'searchCriteria[pageSize]': options.size
        };
        const data = await client.get('V1/eav/attribute-sets/list', params, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
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

export async function showAttributeSetAction(id) {
    try {
        const client = await createClient();
        const data = await client.get(`V1/eav/attribute-sets/${id}`);

        console.log(chalk.bold.blue('\nAttribute Set Details:'));
        console.log(`${chalk.bold('ID:')}             ${data.attribute_set_id}`);
        console.log(`${chalk.bold('Name:')}           ${data.attribute_set_name}`);
        console.log(`${chalk.bold('Entity Type ID:')} ${data.entity_type_id}`);
        console.log(`${chalk.bold('Sort Order:')}     ${data.sort_order}`);
    } catch (e) {
        handleError(e);
    }
}
