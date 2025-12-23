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
    console.error(chalk.red('Error:'), error.message);
    if (process.env.DEBUG) {
        console.error(error);
    }
}
