import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import { loadConfig } from './config.js';

const TABLE_OPTIONS = {
    style: { head: [] }
};

export function printTable(headers, data) {
    const table = new Table({
        ...TABLE_OPTIONS,
        head: headers.map(h => chalk.cyan(h)),
    });
    table.push(...data);
    console.log(table.toString());
}

export function handleError(error) {
    let message = error.message;

    // specific handling for Magento API Errors which are often JSON stringified
    // Format: "API Error 404: {...}"
    const apiErrorMatch = message.match(/^API Error (\d+): (.+)$/);
    if (apiErrorMatch) {
        const statusCode = apiErrorMatch[1];
        const jsonPart = apiErrorMatch[2];
        try {
            const parsed = JSON.parse(jsonPart);
            if (parsed.message) {
                let prettyMessage = parsed.message;
                if (parsed.parameters) {
                    // Substitute %fieldName with values
                    Object.keys(parsed.parameters).forEach(key => {
                        prettyMessage = prettyMessage.replace(new RegExp(`%${key}`, 'g'), parsed.parameters[key]);
                    });
                }
                message = `${prettyMessage}`;
                // Optional: append status code if not 200? The user request just showed the clean message.
            }
        } catch (e) {
            // If parsing fails, keep original message
        }
    }

    console.error(chalk.red('Error:'), message);
    if (process.env.DEBUG) {
        console.error(error);
    }
}

export async function readInput(filePath) {
    if (filePath) {
        if (filePath.startsWith('~/') || filePath === '~') {
            filePath = filePath.replace(/^~/, os.homedir());
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf8');
    }

    if (!process.stdin.isTTY) {
        let data = '';
        for await (const chunk of process.stdin) {
            data += chunk;
        }
        return data;
    }

    return null;
}

export async function validateAdobeCommerce() {
    const config = await loadConfig();
    const profile = config.profiles[config.activeProfile];
    const allowed = ['ac-cloud-paas', 'ac-saas', 'ac-on-prem'];
    if (!profile || !allowed.includes(profile.type)) {
        throw new Error('This command is only available for Adobe Commerce (Cloud, SaaS, On-Premise).');
    }
}

export async function validatePaaSOrOnPrem() {
    const config = await loadConfig();
    const profile = config.profiles[config.activeProfile];
    const allowed = ['ac-cloud-paas', 'ac-on-prem'];
    if (!profile || !allowed.includes(profile.type)) {
        throw new Error('This command is only available for Adobe Commerce (Cloud/On-Premise).');
    }
}

export function buildSearchCriteria(options) {
    const params = {
        'searchCriteria[currentPage]': options.page || 1,
        'searchCriteria[pageSize]': options.size || 20
    };

    let filterIndex = 0;
    const addFilter = (field, value, condition = 'eq') => {
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][field]`] = field;
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][value]`] = value;
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]`] = condition;
        filterIndex++;
    };

    if (options.filter && options.filter.length > 0) {
        for (const f of options.filter) {
            let match = f.match(/^([^<>=]+)(<=|>=|<|>|=)(.*)$/);
            if (match) {
                const field = match[1];
                const op = match[2];
                const value = match[3];
                let condition = 'eq';

                if (op === '>') condition = 'gt';
                else if (op === '<') condition = 'lt';
                else if (op === '>=') condition = 'gteq';
                else if (op === '<=') condition = 'lteq';

                addFilter(field, value, condition);
            } else {
                console.error(chalk.yellow(`Warning: Invalid filter format "${f}". Expected formats like "field=value", "field>value", etc.`));
            }
        }
    }

    return { params, addFilter };
}

export function buildSortCriteria(options) {
    const params = {};
    let sortIndex = 0;

    const addSort = (field, direction = 'ASC') => {
        params[`searchCriteria[sortOrders][${sortIndex}][field]`] = field;
        params[`searchCriteria[sortOrders][${sortIndex}][direction]`] = direction.toUpperCase();
        sortIndex++;
    };

    if (options.sort && options.sort.length > 0) {
        for (const s of options.sort) {
            const parts = s.split(':');
            const field = parts[0];
            const direction = parts.length > 1 ? parts[1].toUpperCase() : 'ASC';
            addSort(field, direction);
        }
    } else if (options.sortBy) {
        addSort(options.sortBy, options.sortOrder || 'ASC');
    }

    return { params, addSort };
}

export function addFilterOption(command) {
    return command.option('--filter <filters...>', 'Generic filters (e.g. field=value, field>value)');
}

export function addSortOption(command) {
    return command
        .option('--sort-by <field>', 'Field to sort by')
        .option('--sort-order <order>', 'Sort order (ASC, DESC)', 'ASC')
        .option('--sort <sorts...>', 'Sort by field and direction (e.g., field:DESC, created_at:ASC)');
}
