import chalk from 'chalk';
import { loadConfig, saveConfig } from '../config.js';
import path from 'node:path';
import { realpath } from 'node:fs/promises';

function getHomeDirectory() {
    return process.env.HOME || process.env.USERPROFILE || '';
}

function expandHomeDirectory(pluginRef) {
    if (pluginRef.startsWith('~/') || pluginRef.startsWith('~\\')) {
        return path.join(getHomeDirectory(), pluginRef.slice(2));
    }

    return pluginRef;
}

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

    if (pluginRef.startsWith('file:')) {
        return realpath(new URL(pluginRef));
    }

    return realpath(expandHomeDirectory(pluginRef));
}

async function normalizePluginReferenceForStorage(pluginRef) {
    if (!isFilesystemPath(pluginRef) || pluginRef.startsWith('file:')) {
        return resolvePluginReference(pluginRef);
    }

    const resolvedPluginRef = await resolvePluginReference(pluginRef);

    if (pluginRef.startsWith('~/') || pluginRef.startsWith('~\\')) {
        return pluginRef;
    }

    return resolvedPluginRef;
}

async function findRegisteredPluginIndex(plugins, pluginRef) {
    const resolvedPluginRef = await resolvePluginReference(pluginRef);

    for (const [index, registeredPlugin] of plugins.entries()) {
        const resolvedRegisteredPlugin = await resolvePluginReference(registeredPlugin);
        if (resolvedRegisteredPlugin === resolvedPluginRef) {
            return index;
        }
    }

    return -1;
}

export async function registerPluginAction(packageName) {
    try {
        const pluginRef = await normalizePluginReferenceForStorage(packageName);
        const config = await loadConfig();
        if (!config.plugins) config.plugins = [];

        if ((await findRegisteredPluginIndex(config.plugins, pluginRef)) !== -1) {
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
        const pluginRef = await normalizePluginReferenceForStorage(packageName);
        const config = await loadConfig();
        const pluginIndex = config.plugins ? await findRegisteredPluginIndex(config.plugins, pluginRef) : -1;
        if (pluginIndex === -1) {
            console.log(chalk.yellow(`Plugin "${pluginRef}" is not registered.`));
            return;
        }

        config.plugins = config.plugins.filter((_, index) => index !== pluginIndex);
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
