export function hasIgnorePluginsFlag(argv = []) {
    return argv.includes('--ignore-plugins');
}
