import chalk from "chalk";

export default async function (context) {
  const { program, eventBus, events } = context;

  // Register a new command
  program
    .command("hello")
    .description("Say hello from a plugin")
    .option("-n, --name <name>", "Name to greet", "World")
    .action((options) => {
      console.log(chalk.green(`Hello ${options.name} from the plugin!`));
    });

  // Hook into an event
  eventBus.on(events.BEFORE_COMMAND, (data) => {
    // data contains { thisCommand, actionCommand, profile }
    // We can log something if debug is on
    if (process.env.DEBUG) {
      console.log(
        chalk.gray(
          `[Plugin Hello] Hooked beforeCommand: ${data.actionCommand.name()}`,
        ),
      );
    }
  });

  eventBus.on(events.AFTER_COMMAND, (data) => {
    if (process.env.DEBUG) {
      console.log(
        chalk.gray(
          `[Plugin Hello] Hooked afterCommand: ${data.actionCommand.name()}`,
        ),
      );
    }
  });

  eventBus.on(events.INIT, () => {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[Plugin Hello] Hooked init`));
    }
  });

  eventBus.on(events.MCP_START, () => {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[Plugin Hello] Hooked mcpStart`));
    }
  });
}
