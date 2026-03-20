import { createClient } from '../api/factory.js';
import { handleError, formatOutput, addFormatOption, addFilterOption, addSortOption, addPaginationOptions, buildSearchCriteria, buildSortCriteria } from '../utils.js';
import chalk from 'chalk';

function getInputDefinitions(cmdDef) {
    const definitions = new Map();
    const sources = [
        ['parameter', cmdDef.parameter],
        ['parameter', cmdDef.parameters],
        ['option', cmdDef.option],
        ['option', cmdDef.options]
    ];

    for (const [source, group] of sources) {
        if (!group || typeof group !== 'object') {
            continue;
        }

        for (const [key, definition] of Object.entries(group)) {
            definitions.set(key, {
                ...definition,
                _source: source
            });
        }
    }

    return Object.fromEntries(definitions);
}

function buildOptionFlags(key, definition = {}) {
    if (definition.flags) {
        return definition.flags;
    }

    const shortFlag = definition.short
        ? `${definition.short.startsWith('-') ? definition.short : `-${definition.short}`}, `
        : '';
    const longFlag = definition.long
        ? (definition.long.startsWith('-') ? definition.long : `--${definition.long}`)
        : `--${key}`;

    if (definition.type === 'boolean') {
        return `${shortFlag}${longFlag}`;
    }

    const argName = definition.argName || 'value';
    const valuePlaceholder = definition.variadic ? `<${argName}...>` : `<${argName}>`;
    return `${shortFlag}${longFlag} ${valuePlaceholder}`;
}

function getFlagTokens(flags) {
    return flags
        .split(',')
        .map(flag => flag.trim().split(' ')[0])
        .filter(Boolean);
}

function hasOption(command, flags) {
    const requestedFlags = new Set(getFlagTokens(flags));

    return (command.options || []).some(option => {
        const existingFlags = [option.short, option.long, ...(option.flags ? getFlagTokens(option.flags) : [])]
            .filter(Boolean);

        return existingFlags.some(flag => requestedFlags.has(flag));
    });
}

function addCommandOption(command, flags, description, defaultValue, required = false) {
    if (hasOption(command, flags)) {
        return command;
    }

    if (required) {
        if (defaultValue !== undefined) {
            return command.requiredOption(flags, description, defaultValue);
        }

        return command.requiredOption(flags, description);
    }

    if (defaultValue !== undefined) {
        return command.option(flags, description, defaultValue);
    }

    return command.option(flags, description);
}

function normalizeListValue(value) {
    if (value === undefined || value === null) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter(item => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof value === 'string' && value.trim().length > 0) {
        return [value];
    }

    return [];
}

function interpolateTemplateValue(template, values) {
    if (typeof template !== 'string' || template.length === 0) {
        return template;
    }

    return template
        .replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
            const value = values[key];
            return value === undefined || value === null ? match : String(value);
        })
        .replace(/\{:\s*([a-zA-Z0-9_]+)\s*\}/g, (match, key) => {
            const value = values[key];
            return value === undefined || value === null ? match : String(value);
        })
        .replace(/:([a-zA-Z0-9_]+)/g, (match, key) => {
            const value = values[key];
            return value === undefined || value === null ? match : String(value);
        });
}

export function registerVirtualCommands(program, config, profile) {
    if (!config || !config.commands || !Array.isArray(config.commands)) {
        return;
    }

    for (const cmdDef of config.commands) {
        // Validation namespace vs command
        if (!cmdDef.name) {
            if (process.env.DEBUG) {
                console.error(chalk.yellow(`Skipping invalid virtual command definition without name: ${JSON.stringify(cmdDef)}`));
            }
            continue;
        }

        // Filtering by connection_types
        if (cmdDef.connection_types && Array.isArray(cmdDef.connection_types)) {
            if (!profile || !profile.type || !cmdDef.connection_types.includes(profile.type)) {
                continue; // Skip if profile type is not in connection_types
            }
        }

        // Command Generation: Find or create subcommands
        let currentCmd = program;
        const parts = cmdDef.name.split(' ');

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const existing = currentCmd.commands.find(c => c.name() === part);
            if (existing) {
                currentCmd = existing;
            } else {
                currentCmd = currentCmd.command(part);
            }
        }

        if (cmdDef.description) {
            currentCmd.description(cmdDef.description);
        } else if (cmdDef.endpoint && cmdDef.method) {
            currentCmd.description(`Virtual command to execute ${cmdDef.method.toUpperCase()} ${cmdDef.endpoint}`);
        }

        if (cmdDef.summary) {
            currentCmd.summary(cmdDef.summary);
        } else if (cmdDef.description) {
            // Fallback to description if summary is not explicitly provided
            // We use a shortened version if it's too long
            const summaryText = cmdDef.description.split('\n')[0];
            currentCmd.summary(summaryText.length > 80 ? summaryText.substring(0, 77) + '...' : summaryText);
        } else if (cmdDef.endpoint && cmdDef.method) {
            currentCmd.summary(`${cmdDef.method.toUpperCase()} ${cmdDef.endpoint}`);
        }

        // It is just a namespace wrapper if there's no endpoint or method
        if (!cmdDef.endpoint || !cmdDef.method) {
            continue;
        }

        if (!hasOption(currentCmd, '-f, --format <type>')) {
            addFormatOption(currentCmd);
        }

        // Map parameters to options
        const inputDefinitions = getInputDefinitions(cmdDef);
        const parameterKeys = Object.keys(inputDefinitions);
        for (const key of parameterKeys) {
            const paramDef = inputDefinitions[key];
            const flags = buildOptionFlags(key, paramDef);
            const desc = paramDef.description || `${paramDef._source === 'option' ? 'Option' : 'Parameter'} ${key}`;

            addCommandOption(currentCmd, flags, desc, paramDef.default, paramDef.required);
        }

        // Add filter and sort options if enabled
        if (cmdDef.supports_filters !== false) {
             if (!hasOption(currentCmd, '--filter <filters...>')) {
                 addFilterOption(currentCmd);
             }
             if (!hasOption(currentCmd, '--sort-by <field>')) {
                 addSortOption(currentCmd);
             }
             if (!hasOption(currentCmd, '-p, --page <number>')) {
                 addPaginationOptions(currentCmd);
             }
        }

        // Add action
        currentCmd.action(async (options) => {
            try {
                const client = await createClient();
                const method = cmdDef.method.toUpperCase();
                let requestPath = cmdDef.endpoint;

                const payload = {};
                let queryParams = {};

                // Process options based on whether they are in the endpoint path
                for (const key of parameterKeys) {
                    const value = options[key];
                    if (value === undefined || value === null) {
                        continue;
                    }

                    const placeholder = `:${key}`;
                    if (requestPath.includes(placeholder)) {
                        requestPath = requestPath.replace(placeholder, encodeURIComponent(value));
                    } else {
                        if (['POST', 'PUT', 'PATCH'].includes(method)) {
                            // Can be mapped to nested objects if needed, but for now simple flat payload
                            payload[key] = value;
                        } else {
                            queryParams[key] = value;
                        }
                    }
                }

                if (cmdDef.supports_filters !== false) {
                     const predefinedFilters = normalizeListValue(cmdDef.filters ?? cmdDef.filter)
                        .map(filter => interpolateTemplateValue(filter, options));
                     const mergedFilterOptions = {
                        ...options,
                        filter: [
                            ...predefinedFilters,
                            ...normalizeListValue(options.filter)
                        ]
                     };
                     const { params: searchParams } = buildSearchCriteria(mergedFilterOptions);
                     const { params: sortParams } = buildSortCriteria(options);

                     queryParams = {
                        ...queryParams,
                        ...searchParams,
                        ...sortParams
                     };
                }

                // Clean up any remaining path placeholders if they had defaults or were optional
                requestPath = requestPath.replace(/:[a-zA-Z0-9_]+/g, '');

                const reqConfig = {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };

                if (options.format === 'json') reqConfig.headers.Accept = 'application/json';
                else if (options.format === 'xml') reqConfig.headers.Accept = 'application/xml';

                const response = await client.request(
                    method,
                    requestPath,
                    Object.keys(payload).length > 0 ? payload : undefined,
                    Object.keys(queryParams).length > 0 ? queryParams : undefined,
                    reqConfig
                );

                if (formatOutput(options, response)) {
                    return;
                }

                if (typeof response === 'object') {
                    console.log(JSON.stringify(response, null, 2));
                } else {
                    console.log(response);
                }

            } catch (error) {
                handleError(error);
            }
        });
    }
}
