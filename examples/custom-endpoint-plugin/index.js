import chalk from 'chalk';

export default async function(context) {
    const { program, createClient } = context;

    program.command('custom-endpoint')
        .description('Call a custom endpoint /v1/custom-endpoint')
        .action(async () => {
            try {
                const client = await createClient();
                console.log(chalk.blue('Calling custom endpoint...'));

                const result = await client.get('V1/custom-endpoint');

                console.log(chalk.green('Response:'));
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error(chalk.red('Error calling custom endpoint:'));
                console.error(error.message);
                if (error.response) {
                    console.error(JSON.stringify(error.response.data, null, 2));
                }
            }
        });
}
