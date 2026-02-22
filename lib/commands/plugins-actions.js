import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';
import path from 'node:path';
import { realpath } from 'node:fs/promises';

function isFilesystemPath(pluginRef) {
    const isScopedPackageName = /^@[^/\\]+\/[^/\\]+$/.test(pluginRef);
    const hasPathSeparator = pluginRef.includes('/') || pluginRef.includes('\\');

    return (
        path.isAbsolute(pluginRef)
        || pluginRef.startsWith('./')
        || pluginRef.startsWith('../')
        || pluginRef.startsWith('.\\')
        || pluginRef.startsWith('..\\')
        || pluginRef.startsWith('~/')
        || pluginRef.startsWith('~\\')
        || pluginRef.startsWith('file:')
        || (hasPathSeparator && !isScopedPackageName)
    );
}

async function resolvePluginReference(pluginRef) {
    if (!isFilesystemPath(pluginRef)) return pluginRef;

    if (pluginRef.startsWith('~/') || pluginRef.startsWith('~\\')) {
        return realpath(path.join(process.env.HOME || process.env.USERPROFILE || '', pluginRef.slice(2)));
    }

    if (pluginRef.startsWith('file:')) {
        return realpath(new URL(pluginRef));
    }

    return realpath(pluginRef);
}

export async function registerPluginAction(packageName) {
    try {
        const pluginRef = await resolvePluginReference(packageName);
        const config = await loadConfig();
        if (!config.plugins) config.plugins = [];

        if (config.plugins.includes(pluginRef)) {
            console.log(chalk.yellow(`Plugin "${pluginRef}" is already registered.`));
            return;
        }

        config.plugins.push(pluginRef);
        await saveConfig(config);
        console.log(chalk.green(`Plugin "${pluginRef}" successfully registered.`));
        console.log(chalk.gray('Make sure the package is installed globally or in the local project.'));
    } catch (error) {
        console.error(chalk.red(`Error registering plugin: ${error.message}`));
    }
}

export async function unregisterPluginAction(packageName) {
    try {
        const pluginRef = await resolvePluginReference(packageName);
        const config = await loadConfig();
        if (!config.plugins || !config.plugins.includes(pluginRef)) {
            console.log(chalk.yellow(`Plugin "${pluginRef}" is not registered.`));
            return;
        }

        config.plugins = config.plugins.filter(p => p !== pluginRef);
        await saveConfig(config);
        console.log(chalk.green(`Plugin "${pluginRef}" successfully unregistered.`));
    } catch (error) {
        console.error(chalk.red(`Error unregistering plugin: ${error.message}`));
    }
}

export async function listPluginsAction() {
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
}
