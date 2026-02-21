import { EventEmitter } from "events";

export class AppEventBus extends EventEmitter {}

export const eventBus = new AppEventBus();

export const events = {
  INIT: "init",
  BEFORE_COMMAND: "beforeCommand",
  AFTER_COMMAND: "afterCommand",
  MCP_START: "mcpStart",
};
