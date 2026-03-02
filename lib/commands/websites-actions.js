import { printTable, handleError, getFormatHeaders, formatOutput } from '../utils.js';
import { createClient } from '../api/factory.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export async function listWebsitesAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const data = await client.get('V1/store/websites', {}, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        const rows = data.map(w => [w.id, w.code, w.name, w.default_group_id]);
        printTable(['ID', 'Code', 'Name', 'Def Group ID'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function searchWebsitesAction(query) {
    try {
        const client = await createClient();
        const data = await client.get('V1/store/websites');
        const filtered = data.filter(w => w.code.includes(query) || w.name.includes(query));
        const rows = filtered.map(w => [w.id, w.code, w.name]);
        printTable(['ID', 'Code', 'Name'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function deleteWebsiteAction(id) {
    try {
        const client = await createClient();
        const answer = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete website ID ${id}?`
        }]);
        if (!answer.confirm) return;

        await client.delete(`V1/store/websites/${id}`);
        console.log(chalk.green(`Website ${id} deleted.`));
    } catch (e) {
        handleError(e);
    }
}

export async function editWebsiteAction(id) {
    try {
        const client = await createClient();
        const all = await client.get('V1/store/websites');
        const current = all.find(w => w.id == id);
        if (!current) throw new Error(`Website ${id} not found`);

        const answers = await inquirer.prompt([
            { name: 'name', message: 'Name', default: current.name },
            { name: 'code', message: 'Code', default: current.code },
            { name: 'default_group_id', message: 'Group ID', default: current.default_group_id },
            { name: 'sort_order', message: 'Sort Order', default: current.sort_order }
        ]);

        await client.put(`V1/store/websites/${id}`, { website: { id: parseInt(id, 10), ...answers } });
        console.log(chalk.green(`Website ${id} updated.`));
    } catch (e) {
        handleError(e);
    }
}
