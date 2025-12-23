import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export function registerStoresCommands(program) {
    const stores = program.command('store').description('Manage store groups');

    stores.command('list')
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('store/storeGroups');
                const rows = data.map(s => [s.id, s.code, s.name, s.website_id, s.root_category_id]);
                printTable(['ID', 'Code', 'Name', 'Web ID', 'Root Cat'], rows);
            } catch (e) { handleError(e); }
        });

    stores.command('search <query>')
        .action(async (query) => {
            try {
                const client = await createClient();
                const data = await client.get('store/storeGroups');
                const filtered = data.filter(s => s.name.includes(query) || s.code.includes(query));
                const rows = filtered.map(s => [s.id, s.code, s.name]);
                printTable(['ID', 'Code', 'Name'], rows);
            } catch (e) { handleError(e); }
        });

    stores.command('delete <id>')
        .action(async (id) => {
            try {
                const client = await createClient();
                const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: `Delete Store Group ${id}?` }]);
                if (!confirm) return;
                await client.delete(`store/storeGroups/${id}`);
                console.log(chalk.green(`Store Group ${id} deleted.`));
            } catch (e) { handleError(e); }
        });

    stores.command('edit <id>')
        .action(async (id) => {
            try {
                const client = await createClient();
                const all = await client.get('store/storeGroups');
                const current = all.find(s => s.id == id);
                if (!current) throw new Error(`Store ${id} not found`);

                const answers = await inquirer.prompt([
                    { name: 'name', message: 'Name', default: current.name },
                    { name: 'code', message: 'Code', default: current.code },
                    { name: 'website_id', message: 'Website ID', default: current.website_id }
                ]);

                await client.put(`store/storeGroups/${id}`, { group: { id: parseInt(id), ...answers } });
                console.log(chalk.green(`Store ${id} updated.`));
            } catch (e) { handleError(e); }
        });

    // Store Views
    const views = stores.command('view').description('Manage store views');

    views.command('list')
        .action(async () => {
            try {
                const client = await createClient();
                const data = await client.get('store/storeViews');
                const rows = data.map(v => [v.id, v.code, v.name, v.store_group_id, v.is_active]);
                printTable(['ID', 'Code', 'Name', 'Group ID', 'Active'], rows);
            } catch (e) { handleError(e); }
        });

    views.command('search <query>')
        .action(async (query) => {
            try {
                const client = await createClient();
                const data = await client.get('store/storeViews');
                const filtered = data.filter(v => v.name.includes(query) || v.code.includes(query));
                const rows = filtered.map(v => [v.id, v.code, v.name]);
                printTable(['ID', 'Code', 'Name'], rows);
            } catch (e) { handleError(e); }
        });

    views.command('delete <id>')
        .action(async (id) => {
            try {
                const client = await createClient();
                const { confirm } = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: `Delete Store View ${id}?` }]);
                if (!confirm) return;
                await client.delete(`store/storeViews/${id}`);
                console.log(chalk.green(`Store View ${id} deleted.`));
            } catch (e) { handleError(e); }
        });

    views.command('edit <id>')
        .action(async (id) => {
            try {
                const client = await createClient();
                const all = await client.get('store/storeViews');
                const current = all.find(v => v.id == id);
                if (!current) throw new Error(`View ${id} not found`);

                const answers = await inquirer.prompt([
                    { name: 'name', message: 'Name', default: current.name },
                    { name: 'code', message: 'Code', default: current.code },
                    { name: 'is_active', message: 'Is Active (0/1)', default: current.is_active }
                ]);

                await client.put(`store/storeViews/${id}`, { store: { id: parseInt(id), ...answers } });
                console.log(chalk.green(`Store View ${id} updated.`));
            } catch (e) { handleError(e); }
        });
}
