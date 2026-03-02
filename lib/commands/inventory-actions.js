import { createClient } from '../api/factory.js';
import {
    printTable, handleError, buildPaginationCriteria,
    getFormatHeaders, formatOutput, buildSearchCriteria, buildSortCriteria
} from '../utils.js';
import chalk from 'chalk';

export async function listStocksAction(options) {
    try {
        const client = await createClient();

        const { params: filterParams } = buildSearchCriteria(options);
        const { params: sortParams } = buildSortCriteria(options);

        const params = {
            ...buildPaginationCriteria(options),
            ...filterParams,
            ...sortParams
        };

        const data = await client.get('V1/inventory/stocks', params);
        const items = data.items ? data.items : data;
        const rows = (Array.isArray(items) ? items : []).map(s => [s.stock_id, s.name]);
        printTable(['ID', 'Name'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function showStockAction(stockId) {
    try {
        const client = await createClient();
        const data = await client.get(`V1/inventory/stocks/${stockId}`);
        console.log(chalk.bold.blue('\n📦 Stock Information'));
        console.log(chalk.gray('━'.repeat(60)));
        console.log(`  ${chalk.bold('ID:')}             ${data.stock_id}`);
        console.log(`  ${chalk.bold('Name:')}           ${data.name}`);
        if (data.extension_attributes && data.extension_attributes.sales_channels) {
            console.log(chalk.bold('\n📢 Sales Channels'));
            data.extension_attributes.sales_channels.forEach(sc => {
                console.log(`  Type: ${sc.type}, Code: ${sc.code}`);
            });
        }
        console.log('');
    } catch (e) {
        handleError(e);
    }
}

export async function resolveStockAction(type, code) {
    try {
        const client = await createClient();
        const stock = await client.get(`V1/inventory/stock-resolver/${type}/${code}`);
        console.log(chalk.bold(`Resolved Stock ID: ${stock.stock_id}`));
    } catch (e) {
        handleError(e);
    }
}

export async function listSourcesAction(options) {
    try {
        const client = await createClient();
        const headers = getFormatHeaders(options);

        const { params: filterParams } = buildSearchCriteria(options);
        const { params: sortParams } = buildSortCriteria(options);

        const params = {
            ...buildPaginationCriteria(options),
            ...filterParams,
            ...sortParams
        };
        const data = await client.get('V1/inventory/sources', params, { headers });

        if (formatOutput(options, data)) {
            return;
        }

        const rows = (data.items || []).map(s => [s.source_code, s.name, s.enabled ? 'Yes' : 'No', s.postcode]);
        console.log(chalk.bold(`Total: ${data.total_count}, Page: ${options.page}, Size: ${options.size}`));
        printTable(['Code', 'Name', 'Enabled', 'Postcode'], rows);
    } catch (e) {
        handleError(e);
    }
}

export async function listSelectionAlgorithmsAction() {
    try {
        const client = await createClient();
        const data = await client.get('V1/inventory/source-selection-algorithm-list');
        const items = data.items ? data.items : data;
        const rows = (Array.isArray(items) ? items : []).map(a => [a.code, a.title, a.description]);
        printTable(['Code', 'Title', 'Description'], rows);
    } catch (e) {
        handleError(e);
    }
}
