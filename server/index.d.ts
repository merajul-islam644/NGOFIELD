// Type stubs for server modules so vite.config.ts (type-checked by
// tsconfig.node.json) can import them without TS7016.

import type { Application } from "express";

export interface CreateAppOptions {
  serveStatic?: "on" | "off" | "auto";
}

export function createApp(opts?: CreateAppOptions): Application;
