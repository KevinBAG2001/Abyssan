/**
 * Escritor de compatibilidad: el techo es el journal persistente.
 * GitUseCases inyecta JournalOperaciones; este singleton escribe en el journal por defecto.
 */
export type { TipoOperacion, UltimaOperacion, DatosRegistroJournal } from './tiposJournal.js';
export { journalOperaciones as registroUltimaOperacion } from './JournalOperaciones.js';
