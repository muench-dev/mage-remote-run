export default async function (context) {
  const { program, eventBus, events, lib } = context;
  const { addFormatOption, formatOutput } = lib.utils;

  // Register a new command
  const cmd = program
    .command("hello")
    .description("Say hello from a plugin")
    .option("-n, --name <name>", "Name to greet", "World");

  addFormatOption(cmd);

  cmd.action((options) => {
    const payload = { message: `Hello ${options.name} from the plugin!` };

    if (!formatOutput(options, payload)) {
      console.log(payload.message);
    }
  });

  // Hook into an event
  eventBus.on(events.BEFORE_COMMAND, (data) => {
    // data contains { thisCommand, actionCommand, profile }
    // We can log something if debug is on
    if (process.env.DEBUG) {
      console.log(
        `[Plugin Hello] Hooked beforeCommand: ${data.actionCommand.name()}`,
      );
    }
  });

  eventBus.on(events.AFTER_COMMAND, (data) => {
    if (process.env.DEBUG) {
      console.log(
        `[Plugin Hello] Hooked afterCommand: ${data.actionCommand.name()}`,
      );
    }
  });

  eventBus.on(events.INIT, () => {
    if (process.env.DEBUG) {
      console.log(`[Plugin Hello] Hooked init`);
    }
  });

  eventBus.on(events.MCP_START, () => {
    if (process.env.DEBUG) {
      console.log(`[Plugin Hello] Hooked mcpStart`);
    }
  });
}
