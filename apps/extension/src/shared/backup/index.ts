/**
 * Barrel export for the Timber backup and export module.
 */

export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createBackup,
  dropStaleNativeLinks,
  mergeBackupIntoState,
  parseBackup,
  type MergeSummary,
  type ParsedBackup,
  type TimberBackupFile,
  exportBookmarksHtml,
} from "@timber/core";
export { backupFileName, downloadTextFile } from "./download-file";
