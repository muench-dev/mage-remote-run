import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import globalDirs from 'global-dirs';
import chalk from 'chalk';
import { createRequire } from 'module';
import { loadConfig } from './config.js';

const require = createRequire(import.meta.url);

function expandHomeDirectory(pluginRef) {
    if (pluginRef.startsWith('~/') || pluginRef.startsWith('~\\')) {
        return path.join(process.env.HOME || process.env.USERPROFILE || '', pluginRef.slice(2));
    }

    return pluginRef;
}

export class PluginLoader {
    constructor(appContext) {
        this.appContext = appContext;
        this.plugins = [];
    }

    async loadPlugins() {
        const config = await loadConfig();
        // If config.plugins is missing, we default to empty array
        const plugins = config.plugins || [];

        await Promise.all(plugins.map(async (pluginName) => {
            try {
                await this.loadPlugin(pluginName);
            } catch (e) {
                console.error(chalk.red(`Failed to load plugin ${pluginName}: ${e.message}`));
                if (process.env.DEBUG) {
                    console.error(e);
                }
            }
        }));
    }

    async loadPlugin(pluginName) {
        const resolvedPluginName = expandHomeDirectory(pluginName);
        let pluginPath;

        // 1. Try local node_modules
        try {
            pluginPath = require.resolve(resolvedPluginName);
        } catch (e) {
            // 2. Try global node_modules (npm)
            try {
                const globalNpmPath = path.join(globalDirs.npm.packages, resolvedPluginName);
                const npmExists = await fs.promises.access(globalNpmPath).then(() => true).catch(() => false);
                if (npmExists) {
                    const pkgJsonPath = path.join(globalNpmPath, 'package.json');
                    const pkgJsonExists = await fs.promises.access(pkgJsonPath).then(() => true).catch(() => false);
                    if (pkgJsonExists) {
                        const pkgContent = await fs.promises.readFile(pkgJsonPath, 'utf-8');
                        const pkg = JSON.parse(pkgContent);
                        const mainFile = pkg.main || 'index.js';
                        pluginPath = path.join(globalNpmPath, mainFile);
                    } else {
                        pluginPath = path.join(globalNpmPath, 'index.js');
                    }
                } else {
                    // 3. Try global node_modules (yarn)
                    const globalYarnPath = path.join(globalDirs.yarn.packages, resolvedPluginName);
                    const yarnExists = await fs.promises.access(globalYarnPath).then(() => true).catch(() => false);
                    if (yarnExists) {
                        const pkgJsonPath = path.join(globalYarnPath, 'package.json');
                        const pkgJsonExists = await fs.promises.access(pkgJsonPath).then(() => true).catch(() => false);
                        if (pkgJsonExists) {
                            const pkgContent = await fs.promises.readFile(pkgJsonPath, 'utf-8');
                            const pkg = JSON.parse(pkgContent);
                            const mainFile = pkg.main || 'index.js';
                            pluginPath = path.join(globalYarnPath, mainFile);
                        } else {
                            pluginPath = path.join(globalYarnPath, 'index.js');
                        }
                    }
                }
            } catch (globalErr) {
                // Ignore global errors, proceed to throw if not found
            }
        }

        if (!pluginPath) {
             throw new Error(`Could not resolve plugin '${pluginName}' locally or globally.`);
        }

        // Import using file URL for absolute paths in ESM
        // Windows paths need to be converted to file URLs
        const pluginUrl = pathToFileURL(pluginPath).href;
        
        if (process.env.DEBUG) {
            console.log(chalk.gray(`Loading plugin from: ${pluginUrl}`));
        }

        // Find plugin root to load static config
        let currentDir = path.dirname(pluginPath);
        let pluginRoot = currentDir;
        while (currentDir !== path.parse(currentDir).root) {
            const pkgPath = path.join(currentDir, 'package.json');
            const pkgExists = await fs.promises.access(pkgPath).then(() => true).catch(() => false);
            if (pkgExists) {
                pluginRoot = currentDir;
                break;
            }
            currentDir = path.dirname(currentDir);
        }

        // Try to load static configuration
        let staticConfig = null;
        const mageConfigPath = path.join(pluginRoot, 'mage-remote-run.json');
        const pkgPath = path.join(pluginRoot, 'package.json');

        if (await fs.promises.access(mageConfigPath).then(() => true).catch(() => false)) {
            staticConfig = JSON.parse(await fs.promises.readFile(mageConfigPath, 'utf8'));
        } else if (await fs.promises.access(pkgPath).then(() => true).catch(() => false)) {
            const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
            if (pkg['mage-remote-run']) {
                staticConfig = pkg['mage-remote-run'];
            }
        }

        if (staticConfig) {
            if (process.env.DEBUG) {
                console.log(chalk.gray(`Found static configuration for plugin: ${pluginName}`));
            }
            // Merge static config into appContext.config
            if (staticConfig.commands && Array.isArray(staticConfig.commands)) {
                if (!this.appContext.config.commands) {
                    this.appContext.config.commands = [];
                }
                this.appContext.config.commands.push(...staticConfig.commands);
            }
        }

        let pluginModule = null;
        try {
            pluginModule = await import(pluginUrl);
        } catch (err) {
            if (process.env.DEBUG) {
                console.error(chalk.yellow(`Could not import plugin module for ${pluginName} at ${pluginUrl}: ${err.message}`));
            }
        }

        if (pluginModule && pluginModule.default) {
            if (typeof pluginModule.default === 'function') {
                 await pluginModule.default(this.appContext);
                 this.plugins.push({ name: pluginName, module: pluginModule });
                 if (process.env.DEBUG) {
                     console.log(chalk.gray(`Loaded plugin script: ${pluginName}`));
                 }
            } else {
                if (!staticConfig) {
                    console.warn(chalk.yellow(`Plugin ${pluginName} does not export a default function and has no static config.`));
                } else {
                    this.plugins.push({ name: pluginName, module: pluginModule });
                    if (process.env.DEBUG) {
                        console.log(chalk.gray(`Loaded plugin config only: ${pluginName}`));
                    }
                }
            }
        } else if (staticConfig) {
             this.plugins.push({ name: pluginName, module: null });
             if (process.env.DEBUG) {
                 console.log(chalk.gray(`Loaded plugin config only: ${pluginName}`));
             }
        } else {
             console.warn(chalk.yellow(`Plugin ${pluginName} could not be loaded because it has no default export and no static config.`));
        }
    }
}
