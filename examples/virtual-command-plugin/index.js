/**
 * Example Plugin: Dynamic Virtual Command Registration
 *
 * This plugin dynamically registers a virtual REST command by publishing
 * a static configuration file (mage-remote-run.json). There is no need
 * to push commands dynamically in Javascript.
 *
 * @param {Object} context
 * @param {Object} context.config - The user configuration object
 * @param {Object} context.lib - Built-in library utilities (utils, commandHelper, config)
 */
export default async function(context) {
    // Left intentionally empty to demonstrate static configurations.
    // Use context.lib.utils, context.lib.commandHelper, or context.lib.config
    // if you need built-in utilities alongside your static config.
}
