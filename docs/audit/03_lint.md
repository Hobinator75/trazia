# A3 — Lint

```
$ npm run lint
> trazia-app@0.1.0 lint
> expo lint
EXIT=0
```

**Komplett sauber.** Keine Warnings, keine Errors.

Konfiguration:
- `eslint.config.js` → `eslint-config-expo` flat config + `eslint-config-prettier`
- `eslint-plugin-prettier` aktiv (Prettier-Verstöße werden als Lint-Fehler gemeldet)

Eine einzige `eslint-disable`-Zeile im gesamten Repo:
- `src/components/ui/AchievementToast.tsx:68` — `react-hooks/exhaustive-deps`

Der Disable ist nicht erläutert. Das ist die einzige Stelle, wo der Linter
ein Auge zudrückt — entweder dependency-Array korrigieren oder einen
1-Zeilen-Kommentar dazu schreiben, **warum** es bewusst ignoriert wird.

## Empfehlung

Lint ist ein leeres Lager — keine Aktion nötig vor Launch. Kosmetisch:
1. AchievementToast.tsx: deps-Array prüfen und `// eslint-disable …`
   entweder entfernen oder begründen.
