import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';
import { createRequire } from 'module';


export function registerPluginsCommands(program) {
    const pluginsCmd = program.command('plugin')
        .description('Manage plugins');

    pluginsCmd.command('register <package-name>')
        .description('Register an installed plugin in the configuration')
        .action(async (packageName) => {
            try {
                const config = await loadConfig();
                if (!config.plugins) {
                    config.plugins = [];
                }

                if (config.plugins.includes(packageName)) {
                    console.log(chalk.yellow(`Plugin "${packageName}" is already registered.`));
                    return;
                }

                config.plugins.push(packageName);
                await saveConfig(config);
                console.log(chalk.green(`Plugin "${packageName}" successfully registered.`));
                console.log(chalk.gray(`Make sure the package is installed globally or in the local project.`));
                
            } catch (error) {
                console.error(chalk.red(`Error registering plugin: ${error.message}`));
            }
        });

    pluginsCmd.command('unregister <package-name>')
        .description('Unregister a plugin from the configuration')
        .action(async (packageName) => {
             try {
                const config = await loadConfig();
                if (!config.plugins || !config.plugins.includes(packageName)) {
                     console.log(chalk.yellow(`Plugin "${packageName}" is not registered.`));
                     return;
                }

                config.plugins = config.plugins.filter(p => p !== packageName);
                await saveConfig(config);
                console.log(chalk.green(`Plugin "${packageName}" successfully unregistered.`));

             } catch (error) {
                 console.error(chalk.red(`Error unregistering plugin: ${error.message}`));
             }
        });

    pluginsCmd.command('list')
        .description('List registered plugins')
        .action(async () => {
            const config = await loadConfig();
            const plugins = config.plugins || [];
            
            if (plugins.length === 0) {
                console.log(chalk.gray('No plugins registered.'));
                return;
            }

            console.log(chalk.bold('Registered Plugins:'));
            plugins.forEach(plugin => {
                console.log(`- ${plugin}`);
            });
        });
}
