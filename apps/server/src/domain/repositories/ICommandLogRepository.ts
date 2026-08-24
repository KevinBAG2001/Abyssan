// Austria: Contrato para el repositorio de logs de auditoria de comandos Git
import { CommandLogEntity } from '../entities/GitEntities.js';

export interface ICommandLogRepository {
  addLog(command: string, durationMs: number, success: boolean, output?: string, error?: string): void;
  getRecentLogs(): CommandLogEntity[];
  clearLogs(): void;
}
