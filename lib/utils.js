import chalk from 'chalk';
import Table from 'cli-table3';
import fs from 'fs';
import os from 'os';
import { loadConfig } from './config.js';

export function printTable(headers, data) {
    const table = new Table({
        head: headers.map(h => chalk.cyan(h)),
        style: { head: [] }
    });
    data.forEach(row => table.push(row));
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
