# 12 — Backup & Restore

## Verdict

Backup/Restore ist für Launch solide. Die früheren Validation-Lücken sind größtenteils geschlossen. Restlücke: einige Unique-/Composite-PK-Konflikte werden nicht vorab validiert, aber die Restore-Transaktion rollt sauber zurück.

## Stärken

- Export baut vollständigen Snapshot (`src/lib/export/snapshot.ts`, Tests in `src/lib/export/__tests__/snapshot.test.ts`).
- `validateSnapshot()` prüft Version, Tabellenform, Pflichtfelder, Duplicate IDs für Haupttabellen, FKs, Self-Reference und `triggeringJourneyId` (`src/lib/backup/restore.ts:77`).
- Destruktive Restore-Phase läuft in `BEGIN TRANSACTION`/`COMMIT` mit Rollback (`src/lib/backup/restore.ts:221`).
- Tests prüfen: falsche Version, kaputte FKs, Duplicate PK, fehlende Felder, Parent-Self-Refs, dangling `triggeringJourneyId`, invalid snapshot before delete, mid-restore rollback (`src/lib/backup/__tests__/restore-validation.test.ts:90`, `src/lib/backup/__tests__/restore-transaction.test.ts:185`).

## Lücken

- `validateSnapshot()` erkennt nicht alle DB-Unique-Regeln vorab: z.B. doppelte `achievementId` wird erst beim Insert gefangen (`src/lib/backup/__tests__/restore-transaction.test.ts:185`).
- Composite-PK-Duplikate in `journeyTags`, `journeyCompanions`, `tripJourneys` werden ebenfalls erst von SQLite gefangen.

## Bewertung

Das ist akzeptabel, weil die Transaktion den vorhandenen Datenbestand bewahrt. UX könnte später bessere Fehlermeldungen bekommen, aber kein Phase-1-Blocker.

