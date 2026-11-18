/**
 * Public entry point for Timber backup creation, parsing, stale-link pruning, and merging.
 */

export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type MergeSummary,
  type ParsedBackup,
  type TimberBackupFile,
} from "./backup.types.ts";

export {
  createBackup,
  dropStaleNativeLinks,
  parseBackup,
} from "./backup-parser.ts";

export { mergeBackupIntoState } from "./backup-merger.ts";
