import { createClient } from '../api/factory.js';
import { printTable, handleError } from '../utils.js';
import chalk from 'chalk';
import inquirer from 'inquirer';

export async function listStoreGroupsAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const data = await client.get('V1/store/storeGroups', {}, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        const rows = data.map(s => [s.id, s.code, s.name, s.website_id, s.root_category_id]);
        printTable(['ID', 'Code', 'Name', 'Web ID', 'Root Cat'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function searchStoreGroupsAction(query) {
    try {
        const client = await createClient();
        const data = await client.get('V1/store/storeGroups');
        const filtered = data.filter(s => s.name.includes(query) || s.code.includes(query));
        const rows = filtered.map(s => [s.id, s.code, s.name]);
        printTable(['ID', 'Code', 'Name'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function deleteStoreGroupAction(id) {
    try {
        const client = await createClient();
        const answer = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: `Delete Store Group ${id}?` }]);
        if (!answer.confirm) return;
        await client.delete(`V1/store/storeGroups/${id}`);
        console.log(chalk.green(`Store Group ${id} deleted.`));
    } catch (e) {
        handleError(e);
    }
}

export async function editStoreGroupAction(id) {
    try {
        const client = await createClient();
        const all = await client.get('V1/store/storeGroups');
        const current = all.find(s => s.id == id);
        if (!current) throw new Error(`Store ${id} not found`);

        const answers = await inquirer.prompt([
            { name: 'name', message: 'Name', default: current.name },
            { name: 'code', message: 'Code', default: current.code },
            { name: 'website_id', message: 'Website ID', default: current.website_id }
        ]);

        await client.put(`V1/store/storeGroups/${id}`, { group: { id: parseInt(id, 10), ...answers } });
        console.log(chalk.green(`Store ${id} updated.`));
    } catch (e) {
        handleError(e);
    }
}

export async function listStoreViewsAction(options) {
    try {
        const client = await createClient();
        const headers = {};
        if (options.format === 'json') headers.Accept = 'application/json';
        else if (options.format === 'xml') headers.Accept = 'application/xml';

        const data = await client.get('V1/store/storeViews', {}, { headers });

        if (options.format === 'json') {
            console.log(JSON.stringify(data, null, 2));
            return;
        }
        if (options.format === 'xml') {
            console.log(data);
            return;
        }

        const rows = data.map(v => [v.id, v.code, v.name, v.store_group_id, v.is_active]);
        printTable(['ID', 'Code', 'Name', 'Group ID', 'Active'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function searchStoreViewsAction(query) {
    try {
        const client = await createClient();
        const data = await client.get('V1/store/storeViews');
        const filtered = data.filter(v => v.name.includes(query) || v.code.includes(query));
        const rows = filtered.map(v => [v.id, v.code, v.name]);
        printTable(['ID', 'Code', 'Name'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function deleteStoreViewAction(id) {
    try {
        const client = await createClient();
        const answer = await inquirer.prompt([{ type: 'confirm', name: 'confirm', message: `Delete Store View ${id}?` }]);
        if (!answer.confirm) return;
        await client.delete(`V1/store/storeViews/${id}`);
        console.log(chalk.green(`Store View ${id} deleted.`));
    } catch (e) {
        handleError(e);
    }
}

export async function editStoreViewAction(id) {
    try {
        const client = await createClient();
        const all = await client.get('V1/store/storeViews');
        const current = all.find(v => v.id == id);
        if (!current) throw new Error(`View ${id} not found`);

        const answers = await inquirer.prompt([
            { name: 'name', message: 'Name', default: current.name },
            { name: 'code', message: 'Code', default: current.code },
            { name: 'is_active', message: 'Is Active (0/1)', default: current.is_active }
        ]);

        await client.put(`V1/store/storeViews/${id}`, { store: { id: parseInt(id, 10), ...answers } });
        console.log(chalk.green(`Store View ${id} updated.`));
    } catch (e) {
        handleError(e);
    }
}

export async function listStoreConfigsAction() {
    try {
        const client = await createClient();
        const data = await client.get('V1/store/storeConfigs');
        data.forEach(c => {
            console.log(chalk.bold.cyan(`[ID: ${c.id}] ${c.code}`));
            console.log(chalk.gray('  Website ID: ') + c.website_id);
            console.log(chalk.gray('  Locale:     ') + c.locale);
            console.log(chalk.gray('  Timezone:   ') + c.timezone);
            console.log(chalk.gray('  Weight:     ') + c.weight_unit);
            console.log(chalk.gray('  Currency:   ') + `${c.base_currency_code} / ${c.default_display_currency_code}`);
            console.log(chalk.gray('  Base URL:          ') + c.base_url);
            console.log(chalk.gray('  Base Link URL:     ') + c.base_link_url);
            console.log(chalk.gray('  Base Static URL:   ') + c.base_static_url);
            console.log(chalk.gray('  Base Media URL:    ') + c.base_media_url);
            console.log(chalk.gray('  Secure URL:        ') + c.secure_base_url);
            console.log(chalk.gray('  Secure Link URL:   ') + c.secure_base_link_url);
            console.log(chalk.gray('  Secure Static URL: ') + c.secure_base_static_url);
            console.log(chalk.gray('  Secure Media URL:  ') + c.secure_base_media_url);
            console.log('');
        });
    } catch (e) {
        handleError(e);
    }
}
