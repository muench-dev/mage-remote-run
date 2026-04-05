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

export function printAddress(addr, indent = 2) {
    if (!addr) return;

    const name = `${addr.firstname || ''} ${addr.lastname || ''}`.trim();
    const street = Array.isArray(addr.street) ? addr.street : (addr.street ? [addr.street] : []);

    let region = addr.region || addr.region_code || '';
    if (typeof region === 'object') {
        region = region.region_code || region.region || '';
    }

    const cityParts = [
        addr.city,
        region,
        addr.postcode
    ].filter(Boolean);

    const lines = [
        name,
        ...street,
        cityParts.length > 0 ? cityParts.join(', ') : null,
        addr.country_id,
        addr.telephone ? `T: ${addr.telephone}` : null
    ].filter(Boolean);

    const indentStr = ' '.repeat(indent);
    if (lines.length === 0) {
        console.log(chalk.gray(`${indentStr}(Empty Address)`));
    } else {
        lines.forEach(l => console.log(`${indentStr}${l}`));
    }
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
        ...buildPaginationCriteria(options)
    };

    let filterIndex = 0;
    const addFilter = (field, value, condition = 'eq') => {
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][field]`] = field;
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][value]`] = value;
        params[`searchCriteria[filter_groups][${filterIndex}][filters][0][condition_type]`] = condition;
        filterIndex++;
    };

    if (options.filter && options.filter.length > 0) {
        for (const group of options.filter) {
            const orFilters = group.split(/\s*\|\|\s*/);
            let addedAny = false;
            let orIndex = 0;

            for (const f of orFilters) {
                let match = f.match(/^([\w\.]+)(?::([a-z!]+))?(?:(<=|>=|<|>|=|!=|!~|~|\?|!|@@)(.*))?$/);
                if (match) {
                    const field = match[1];
                    const opString = match[2];
                    const shorthand = match[3];
                    let value = match[4] || '';

                    let condition = 'eq';

                    if (opString) {
                        condition = opString === '!in' ? 'nin' : opString;
                    } else if (shorthand) {
                        switch (shorthand) {
                            case '>': condition = 'gt'; break;
                            case '<': condition = 'lt'; break;
                            case '>=': condition = 'gteq'; break;
                            case '<=': condition = 'lteq'; break;
                            case '!=': condition = 'neq'; break;
                            case '~': condition = 'like'; break;
                            case '!~': condition = 'nlike'; break;
                            case '@@': condition = 'finset'; break;
                            case '?': condition = 'null'; value = '1'; break;
                            case '!': condition = 'notnull'; value = '1'; break;
                            default: condition = 'eq';
                        }
                    } else {
                        console.error(chalk.yellow(`Warning: Invalid filter format "${f}". Expected formats like "field=value", "field:like=value", etc.`));
                        continue;
                    }

                    if ((condition === 'like' || condition === 'nlike') && value.includes('*')) {
                        value = value.replaceAll('*', '%');
                    }

                    params[`searchCriteria[filter_groups][${filterIndex}][filters][${orIndex}][field]`] = field;
                    params[`searchCriteria[filter_groups][${filterIndex}][filters][${orIndex}][value]`] = value;
                    params[`searchCriteria[filter_groups][${filterIndex}][filters][${orIndex}][condition_type]`] = condition;

                    orIndex++;
                    addedAny = true;
                } else {
                    console.error(chalk.yellow(`Warning: Invalid filter format "${f}". Expected formats like "field=value", "field:like=value", etc.`));
                }
            }
            if (addedAny) {
                filterIndex++;
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
            const direction = (parts.length > 1 && parts[1]) ? parts[1].toUpperCase() : 'ASC';
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

export function addPaginationOptions(command) {
    return command
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --size <number>', 'Page size', '20');
}

export function buildPaginationCriteria(options) {
    return {
        'searchCriteria[currentPage]': options.page || 1,
        'searchCriteria[pageSize]': options.size || 20
    };
}

export function addFormatOption(command) {
    return command.option('-f, --format <type>', 'Output format (text, json, xml)', 'text');
}

export function getFormatHeaders(options) {
    const headers = {};
    if (options.format === 'json') {
        headers.Accept = 'application/json';
    } else if (options.format === 'xml') {
        headers.Accept = 'application/xml';
    }
    return headers;
}

export function formatOutput(options, data) {
    if (options.format === 'json') {
        console.log(JSON.stringify(data, null, 2));
        return true;
    }
    if (options.format === 'xml') {
        console.log(data);
        return true;
    }
    return false;
}

export function applyLocalSearchCriteria(data, options) {
    let result = [...data];

    if (options.filter && options.filter.length > 0) {
        options.filter.forEach(group => {
            const orFilters = group.split(/\s*\|\|\s*/);
            result = result.filter(item => {
                return orFilters.some(f => {
                    const match = f.match(/^([\w\.]+)(?::([a-z!]+))?(?:(<=|>=|<|>|=|!=|!~|~|\?|!|@@)(.*))?$/);
                    if (!match) return false;

                    const field = match[1];
                    const opString = match[2];
                    const shorthand = match[3];
                    let value = match[4] || '';

                    let condition = 'eq';
                    if (opString) {
                        condition = opString === '!in' ? 'nin' : opString;
                    } else if (shorthand) {
                        switch (shorthand) {
                            case '>': condition = 'gt'; break;
                            case '<': condition = 'lt'; break;
                            case '>=': condition = 'gteq'; break;
                            case '<=': condition = 'lteq'; break;
                            case '!=': condition = 'neq'; break;
                            case '~': condition = 'like'; break;
                            case '!~': condition = 'nlike'; break;
                            case '@@': condition = 'finset'; break;
                            case '?': condition = 'null'; value = '1'; break;
                            case '!': condition = 'notnull'; value = '1'; break;
                            default: condition = 'eq';
                        }
                    }

                    if ((condition === 'like' || condition === 'nlike') && value.includes('*')) {
                        value = value.replaceAll('*', '%');
                    }

                    const itemValue = item[field];
                    const strItemVal = String(itemValue || '').toLowerCase();
                    const strVal = String(value).toLowerCase();
                    const numItemVal = Number(itemValue);
                    const numVal = Number(value);

                    switch (condition) {
                        case 'eq': return String(itemValue) === String(value);
                        case 'neq': return String(itemValue) !== String(value);
                        case 'gt': return numItemVal > numVal;
                        case 'gteq': return numItemVal >= numVal;
                        case 'lt': return numItemVal < numVal;
                        case 'lteq': return numItemVal <= numVal;
                        case 'like':
                            const regexFromLike = new RegExp('^' + strVal.replace(/%/g, '.*') + '$', 'i');
                            return regexFromLike.test(strItemVal);
                        case 'nlike':
                            const nregexFromLike = new RegExp('^' + strVal.replace(/%/g, '.*') + '$', 'i');
                            return !nregexFromLike.test(strItemVal);
                        case 'in':
                            return String(value).split(',').map(s => s.trim()).includes(String(itemValue));
                        case 'nin':
                            return !String(value).split(',').map(s => s.trim()).includes(String(itemValue));
                        case 'null': return itemValue === null || itemValue === undefined;
                        case 'notnull': return itemValue !== null && itemValue !== undefined;
                        case 'finset':
                            return String(itemValue).split(',').map(s => s.trim()).includes(String(value));
                        default: return false;
                    }
                });
            });
        });
    }

    if (options.sort && options.sort.length > 0) {
        options.sort.forEach(s => {
            const parts = s.split(':');
            const field = parts[0];
            const direction = parts.length > 1 ? parts[1].toUpperCase() : 'ASC';
            result.sort((a, b) => {
                if (a[field] < b[field]) return direction === 'ASC' ? -1 : 1;
                if (a[field] > b[field]) return direction === 'ASC' ? 1 : -1;
                return 0;
            });
        });
    } else if (options.sortBy) {
        const field = options.sortBy;
        const direction = (options.sortOrder || 'ASC').toUpperCase();
        result.sort((a, b) => {
            if (a[field] < b[field]) return direction === 'ASC' ? -1 : 1;
            if (a[field] > b[field]) return direction === 'ASC' ? 1 : -1;
            return 0;
        });
    }

    if (options.page && options.size) {
        // Technically addPaginationOptions sets defaults
        const page = parseInt(options.page || 1, 10);
        const size = parseInt(options.size || 20, 10);
        const start = (page - 1) * size;
        result = result.slice(start, start + size);
    } else if (options.page || options.size) {
        const page = parseInt(options.page || 1, 10);
        const size = parseInt(options.size || 20, 10);
        const start = (page - 1) * size;
        result = result.slice(start, start + size);
    }

    return result;
}
