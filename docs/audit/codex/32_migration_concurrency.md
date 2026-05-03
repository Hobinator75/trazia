# Codex Cross-Audit v2 - Achievement-Migration Concurrency

Fokus: `src/db/migrations/0002_achievement_id_migration.sql`, `src/lib/achievements/migration.ts`, `src/hooks/useAchievementMigrations.ts`, `src/hooks/useDbReady.ts`.

## Hauptbefund

Claude Code hat die Code-Migration ordentlich idempotent gemacht, aber die gefaehrlichste Reihenfolge uebersehen: Drizzle fuehrt `0002_achievement_id_migration.sql` aus, bevor `useAchievementMigrations(migrations.success)` ueberhaupt laeuft (`useDbReady.ts:13-17`). Die SQL-Migration macht blind:

```sql
UPDATE achievement_unlocks SET achievement_id = 'transatlantic'
  WHERE achievement_id = 'atlantic_crosser';
```

Bei einem User, der aus Backup/Restore oder alter Version beide Unlocks besitzt, verletzt das den Unique-Index auf `achievement_id` (`schema.ts:193-207`). Dann ist `migrations.success` false und der idempotente Schutzcode erreicht den User nie. Der Kommentar in `0002_achievement_id_migration.sql:6-10` behauptet, die Code-Seite fange diesen Fall ab; fuer genau diesen Konflikt stimmt das nicht.

## Crash-/Concurrency-Pfade

| Szenario | Code-Verhalten | Bewertung |
|---|---|---|
| Crash vor Code-Migration, SQL 0002 noch nicht applied | Drizzle versucht beim naechsten Start erneut. | OK, sofern keine Unique-Kollision. |
| Crash waehrend SQL 0002 | SQLite Statement ist atomar; Drizzle-Journal entscheidet. Kommentar behauptet mehr Sicherheit als belegt. | Wahrscheinlich OK, aber nicht verifiziert. |
| User hat `atlantic_crosser` und `transatlantic` | SQL 0002 scheitert vor Code-Migration. App-DB-Migration kann Launch blockieren. | `[LAUNCH] BUG` |
| Crash waehrend Code-Migration | Code nutzt `BEGIN TRANSACTION`, prueft Postcondition, rollt bei Fehler zurueck (`migration.ts:139-184`). Naechster Cold-Start kann retryen. | OK |
| DB-Lock/WAL-Konflikt waehrend Code-Migration | Fehler landet in `result.error`; Hook loggt Sentry und setzt `done: true` (`useAchievementMigrations.ts:35-52`). App soll weiterlaufen, Retry erst beim naechsten Cold-Start. | Akzeptabel |
| Zwei Code-Migrationen parallel | Kein expliziter Mutex. Beide koennen `create log table`, `alreadyApplied`, `BEGIN` sehen; eine kann locken oder danach skippen. | Niedriges Risiko, aber nicht formal concurrency-safe. |
| Reiner Konflikt im Code-Pfad | Code wuerde beide Rows behalten und `result.conflicts` setzen (`migration.ts:127-136`). Keine Daten werden geloescht. | Launch-schonend, aber Legacy-Dupe bleibt. |
| Sentry bei Konflikt | Hook capturet nur `result.error` (`useAchievementMigrations.ts:35-45`). `result.conflicts` ohne Error wird nicht gemeldet. | `[LAUNCH] BUG` gegen Checklist-Erwartung |

## Empfehlung

1. SQL 0002 entweder entfernen/ersetzen oder konfliktfest machen: `UPDATE ... WHERE achievement_id = 'atlantic_crosser' AND NOT EXISTS (...)`; bei Konflikt Legacy-Row nicht anfassen.
2. Alternativ: Drizzle-SQL-Rename ganz vermeiden und nur die Code-Migration verwenden, weil sie best-effort/non-blocking sein soll.
3. `useAchievementMigrations` sollte `result.conflicts.length > 0` explizit an Sentry melden, auch wenn `result.error` leer ist.
4. Ein Test muss den echten Reihenfolge-Pfad abbilden: migrated DB mit beiden Unlocks -> Drizzle migration 0002 -> erwartetes Nicht-Crashen.

