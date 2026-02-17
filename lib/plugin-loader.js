import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import globalDirs from 'global-dirs';
import chalk from 'chalk';
import { createRequire } from 'module';
import { loadConfig } from './config.js';

const require = createRequire(import.meta.url);

export class PluginLoader {
    constructor(appContext) {
        this.appContext = appContext;
        this.plugins = [];
    }

    async loadPlugins() {
        const config = await loadConfig();
        // If config.plugins is missing, we default to empty array
        const plugins = config.plugins || [];

        for (const pluginName of plugins) {
            try {
                await this.loadPlugin(pluginName);
            } catch (e) {
                console.error(chalk.red(`Failed to load plugin ${pluginName}: ${e.message}`));
                if (process.env.DEBUG) {
                    console.error(e);
                }
            }
        }
    }

    async loadPlugin(pluginName) {
        let pluginPath;

        // 1. Try local node_modules
        try {
            pluginPath = require.resolve(pluginName);
        } catch (e) {
            // 2. Try global node_modules (npm)
            try {
                const globalNpmPath = path.join(globalDirs.npm.packages, pluginName);
                if (fs.existsSync(globalNpmPath)) {
                    const pkgJsonPath = path.join(globalNpmPath, 'package.json');
                    if (fs.existsSync(pkgJsonPath)) {
                        const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
                        const mainFile = pkg.main || 'index.js';
                        pluginPath = path.join(globalNpmPath, mainFile);
                    } else {
                         pluginPath = path.join(globalNpmPath, 'index.js');
                    }
                } else {
                    // 3. Try global node_modules (yarn)
                     const globalYarnPath = path.join(globalDirs.yarn.packages, pluginName);
                     if (fs.existsSync(globalYarnPath)) {
                        const pkgJsonPath = path.join(globalYarnPath, 'package.json');
                        if (fs.existsSync(pkgJsonPath)) {
                            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
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

        const pluginModule = await import(pluginUrl);

        if (pluginModule && pluginModule.default) {
            if (typeof pluginModule.default === 'function') {
                 await pluginModule.default(this.appContext);
                 this.plugins.push({ name: pluginName, module: pluginModule });
                 if (process.env.DEBUG) {
                     console.log(chalk.gray(`Loaded plugin: ${pluginName}`));
                 }
            } else {
                console.warn(chalk.yellow(`Plugin ${pluginName} does not export a default function.`));
            }
        }
    }
}
