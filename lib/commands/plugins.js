import { listPluginsAction, registerPluginAction, unregisterPluginAction } from './plugins-actions.js';

export function registerPluginsCommands(program) {
    const pluginsCmd = program.command('plugin').description('Manage plugins');

    pluginsCmd.command('register <package-name>')
        .description('Register an installed plugin in the configuration')
        .action(registerPluginAction);

    pluginsCmd.command('unregister <package-name>')
        .description('Unregister a plugin from the configuration')
        .action(unregisterPluginAction);

    pluginsCmd.command('list')
        .description('List registered plugins')
        .action(listPluginsAction);
}
