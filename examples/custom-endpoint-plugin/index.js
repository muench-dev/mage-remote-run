import chalk from 'chalk';

export default async function(context) {
    const { program, createClient, lib } = context;
    const { handleError, printTable } = lib.utils;

    program.command('custom-endpoint')
        .description('Call a custom endpoint /v1/custom-endpoint')
        .action(async () => {
            try {
                const client = await createClient();
                console.log(chalk.blue('Calling custom endpoint...'));

                const result = await client.get('V1/custom-endpoint');

                if (Array.isArray(result?.items)) {
                    printTable(Object.keys(result.items[0] ?? {}), result.items.map(Object.values));
                } else {
                    console.log(JSON.stringify(result, null, 2));
                }
            } catch (error) {
                handleError(error);
            }
        });
}
