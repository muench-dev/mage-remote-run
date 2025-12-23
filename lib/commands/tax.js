import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';

export function registerTaxCommands(program) {
    const tax = program.command('tax').description('Manage tax classes');

    const taxClass = tax.command('class').description('Manage tax classes');

    taxClass.command('list')
        .description('List tax classes')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20')
        .action(async (options) => {
            try {
                const client = await createClient();
                const params = {
                    'searchCriteria[currentPage]': options.page,
                    'searchCriteria[pageSize]': options.size
                };
                const data = await client.get('V1/taxClasses/search', params);
                const rows = (data.items || []).map(tc => [
                    tc.class_id,
                    tc.class_name,
                    tc.class_type
                ]);
                console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
                printTable(['ID', 'Name', 'Type'], rows);
            } catch (e) { handleError(e); }
        });

    taxClass.command('show <id>')
        .description('Show tax class details')
        .action(async (id) => {
            try {
                const client = await createClient();
                const data = await client.get(`V1/taxClasses/${id}`);

                console.log(chalk.bold.blue('\nTax Class Details:'));
                console.log(`${chalk.bold('ID:')}   ${data.class_id}`);
                console.log(`${chalk.bold('Name:')} ${data.class_name}`);
                console.log(`${chalk.bold('Type:')} ${data.class_type}`);

            } catch (e) { handleError(e); }
        });
}
