import chalk from 'chalk';
import Table from 'cli-table3';

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
