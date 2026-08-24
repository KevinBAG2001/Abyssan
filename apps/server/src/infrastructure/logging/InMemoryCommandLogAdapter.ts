// Austria: Adaptador de infraestructura en memoria para el buffer circular de logs de comandos Git
import { ICommandLogRepository } from '../../domain/repositories/ICommandLogRepository.js';
import { CommandLogEntity } from '../../domain/entities/GitEntities.js';

export class InMemoryCommandLogAdapter implements ICommandLogRepository {
  private logs: CommandLogEntity[] = [];
  private readonly MAX_LOGS = 150;

  addLog(command: string, durationMs: number, success: boolean, output?: string, error?: string): void {
    const entry: CommandLogEntity = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      command,
      durationMs,
      success,
      output,
      error,
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }
  }

  getRecentLogs(): CommandLogEntity[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const commandLogAdapter = new InMemoryCommandLogAdapter();
