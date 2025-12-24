import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerWebsitesCommands(program) {
    const websites = program.command('website').description('Manage websites');

    websites.command('list')
        .description('List all websites')
        .option('-f, --format <type>', 'Output format (text, json, xml)', 'text')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website list
  $ mage-remote-run website list --format json
`)
        .action(async (options) => {
            try {
                const client = await createClient();
                const headers = {};
                if (options.format === 'json') headers['Accept'] = 'application/json';
                else if (options.format === 'xml') headers['Accept'] = 'application/xml';

                const data = await client.get('V1/store/websites', {}, { headers });

                if (options.format === 'json') {
                    console.log(JSON.stringify(data, null, 2));
                    return;
                }
                if (options.format === 'xml') {
                    console.log(data);
                    return;
                }

                const rows = data.map(w => [w.id, w.code, w.name, w.default_group_id]);
                printTable(['ID', 'Code', 'Name', 'Def Group ID'], rows);
            } catch (e) { handleError(e); }
        });

    websites.command('search <query>')
        .description('Search websites by code or name (local filter)')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website search "Main"
`)
        .action(async (query) => {
            try {
                const client = await createClient();
                const data = await client.get('V1/store/websites');
                const filtered = data.filter(w =>
                    w.code.includes(query) || w.name.includes(query)
                );
                const rows = filtered.map(w => [w.id, w.code, w.name]);
                printTable(['ID', 'Code', 'Name'], rows);
            } catch (e) { handleError(e); }
        });

    websites.command('delete <id>')
        .description('Delete a website by ID')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website delete 1
`)
        .action(async (id) => {
            try {
                const client = await createClient();
                // Confirm
                const { confirm } = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'confirm',
                    message: `Are you sure you want to delete website ID ${id}?`
                }]);
                if (!confirm) return;

                await client.delete(`V1/store/websites/${id}`);
                console.log(chalk.green(`Website ${id} deleted.`));
            } catch (e) { handleError(e); }
        });

    websites.command('edit <id>')
        .description('Edit a website')
        .addHelpText('after', `
Examples:
  $ mage-remote-run website edit 1
`)
        .action(async (id) => {
            try {
                const client = await createClient();
                // Fetch current
                // Actually Magento doesn't have a single GET /store/websites/:id easily publicly documented distinct from the list?
                // But let's assume we fetch list and find it.
                const all = await client.get('V1/store/websites');
                const current = all.find(w => w.id == id);
                if (!current) throw new Error(`Website ${id} not found`);

                const answers = await inquirer.prompt([
                    { name: 'name', message: 'Name', default: current.name },
                    { name: 'code', message: 'Code', default: current.code },
                    { name: 'default_group_id', message: 'Group ID', default: current.default_group_id },
                    { name: 'sort_order', message: 'Sort Order', default: current.sort_order }
                ]);

                // PUT /V1/store/websites/:id
                await client.put(`V1/store/websites/${id}`, { website: { id: parseInt(id), ...answers } });
                console.log(chalk.green(`Website ${id} updated.`));
            } catch (e) { handleError(e); }
        });
}
