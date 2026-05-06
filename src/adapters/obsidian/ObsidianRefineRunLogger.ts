import type { Plugin } from "obsidian";

import type { RefineRunLogEvent, RefineRunLogger } from "../../application/RefineRunLogger";
import { redactSensitiveStrings } from "../../runtime/redaction";

export const REFINE_RUN_LOG_PATH = ".obsidian/plugins/obsidian-refined-layer/logs";

export class ObsidianRefineRunLogger implements RefineRunLogger {
  private readonly filePath: string;
  private writeQueue = Promise.resolve();

  constructor(
    private readonly plugin: Plugin,
    runId: string,
  ) {
    this.filePath = `${REFINE_RUN_LOG_PATH}/${sanitizeFileName(runId)}.jsonl`;
  }

  async write(event: RefineRunLogEvent): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.writeLine(event));
    await this.writeQueue;
  }

  private async writeLine(event: RefineRunLogEvent): Promise<void> {
    const adapter = this.plugin.app.vault.adapter;
    const safeEvent = redactSensitiveStrings(event);
    const nextLine = `${JSON.stringify(safeEvent)}\n`;

    if (!(await adapter.exists(REFINE_RUN_LOG_PATH))) {
      await adapter.mkdir(REFINE_RUN_LOG_PATH);
    }

    const current = await adapter.exists(this.filePath)
      ? await adapter.read(this.filePath).catch(() => "")
      : "";
    await adapter.write(this.filePath, current + nextLine);
  }
}

function sanitizeFileName(value: string): string {
  return value.replace(/[<>:"/\\|?*\s]/g, "-");
}
