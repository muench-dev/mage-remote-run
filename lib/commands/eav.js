import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerEavCommands(program) {
    const eav = program.command('eav').description('Manage EAV attributes and sets');

    // Attribute Sets
    const attributeSets = eav.command('attribute-set').description('Manage attribute sets');

    attributeSets.command('list')
        .description('List all attribute sets')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('eav/attribute-sets/list', params);
                const rows = (data.items || []).map(set => [
                    set.attribute_set_id,
                    set.attribute_set_name,
                    set.entity_type_id,
                    set.sort_order
                ]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Name', 'Entity Type ID', 'Sort Order'], rows);
            } catch (e) { handleError(e); }
        });

    attributeSets.command('show <id>')
        .description('Show attribute set details')
        .action(async (id) => {
            try {
                const client = await createClient();
                const data = await client.get(`eav/attribute-sets/${id}`);

                console.log(chalk.bold.blue('\nAttribute Set Details:'));
                console.log(`${chalk.bold('ID:')}             ${data.attribute_set_id}`);
                console.log(`${chalk.bold('Name:')}           ${data.attribute_set_name}`);
                console.log(`${chalk.bold('Entity Type ID:')} ${data.entity_type_id}`);
                console.log(`${chalk.bold('Sort Order:')}     ${data.sort_order}`);

            } catch (e) { handleError(e); }
        });
}
