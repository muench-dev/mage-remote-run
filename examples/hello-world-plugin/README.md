# Hello World Plugin Example

This is a minimal example plugin for `mage-remote-run` demonstrating how to extend the CLI functionality.

## Features

1. **Custom Command**: Adds a new `hello` command to the CLI.
2. **Event Hook**: Listens to the `beforeCommand` event to log activity.

## Structure

- `package.json`: Defines the plugin as an ESM module.
- `index.js`: The entry point that exports a default function receiving the application context.

## How to Test

### Option 1: Symlink (Recommended)

1. Navigate to this directory and link the package globally:
   ```bash
   cd examples/hello-world-plugin
   npm link
   ```

2. Register the plugin name in `mage-remote-run`:
   ```bash
   mage-remote-run plugin register mage-remote-run-plugin-hello
   ```

3. Run the new command:
   ```bash
   mage-remote-run hello --name "Developer"
   ```

### Option 2: Absolute Path

1. Get the absolute path to this directory.
2. Register it directly:
   ```bash
   mage-remote-run plugin register /absolute/path/to/examples/hello-world-plugin
   ```

## Code Walkthrough

```javascript
export default async function(context) {
    const { program, eventBus, EVENTS } = context;

    // 1. Register a new command using Commander.js
    program.command('hello')
        .description('Say hello from a plugin')
        .option('-n, --name <name>', 'Name to greet', 'World')
        .action((options) => {
            console.log(`Hello ${options.name} from the plugin!`);
        });

    // 2. Listen to application events
    eventBus.on(EVENTS.BEFORE_COMMAND, (data) => {
        // Execute logic before any command runs
    });
}
```
