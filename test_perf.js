import { performance } from 'node:perf_hooks';

// Simulate the old way
async function resolvePluginReference(pluginRef) {
    // simulate I/O delay
    return new Promise(resolve => setTimeout(() => resolve(pluginRef + '-resolved'), 10));
}

async function findRegisteredPluginIndexOld(plugins, pluginRef) {
    const resolvedPluginRef = await resolvePluginReference(pluginRef);

    for (const [index, registeredPlugin] of plugins.entries()) {
        const resolvedRegisteredPlugin = await resolvePluginReference(registeredPlugin);
        if (resolvedRegisteredPlugin === resolvedPluginRef) {
            return index;
        }
    }

    return -1;
}

// Simulate the new way
async function findRegisteredPluginIndexNew(plugins, pluginRef) {
    const resolvedPluginRef = await resolvePluginReference(pluginRef);

    const resolvedPlugins = await Promise.all(plugins.map(plugin => resolvePluginReference(plugin)));

    for (const [index, resolvedRegisteredPlugin] of resolvedPlugins.entries()) {
        if (resolvedRegisteredPlugin === resolvedPluginRef) {
            return index;
        }
    }

    return -1;
}

const plugins = Array.from({length: 100}, (_, i) => `plugin-${i}`);
const target = 'plugin-99'; // Worst case

async function run() {
    const startOld = performance.now();
    await findRegisteredPluginIndexOld(plugins, target);
    const endOld = performance.now();
    console.log(`Old: ${endOld - startOld} ms`);

    const startNew = performance.now();
    await findRegisteredPluginIndexNew(plugins, target);
    const endNew = performance.now();
    console.log(`New: ${endNew - startNew} ms`);
}

run();
