# 22 — Vergleich mit vorherigen Audits

## Gelesene Reports

- `docs/audit/00_summary.md`
- `docs/audit/codex/00_codex_summary.md`
- `docs/audit/codex/final/00_final_summary.md`

## Was frühere Audits richtig hatten

- Achievement appliesTo/Mode-Isolation war ein realer Risikobereich; aktueller Code ist dort stark.
- Seed-Fast-Path/FK-Risiko war berechtigt und existiert weiterhin für Bestandsuser.
- Restore-Validation war früher zu dünn; aktueller Code hat diese Lücke weitgehend geschlossen.
- Form-Duration-Testkopien waren ein legitimer Drift-Risiko; `buildJourneyPatch` ist jetzt echt angeschlossen.

## Was jetzt anders ist

- Migrations-Bundling ist nicht mehr der alte Export-Blocker. Temporärer `expo export` ist grün.
- Backup/Restore ist nach Final-Cleanup launch-fähig genug.
- Stats-Memoization ist angeschlossen; alter Befund ist erledigt.

## Wo frühere Audits zu großzügig waren

- Phase-1-Gating: Final Review akzeptierte offenbar Flight+Other/locked teaser. Unter der aktuellen Vorgabe "nur Flug sichtbar" ist das zu großzügig.
- Privacy: In-App-Legal-Copy und nicht persistierter Crash-Report-Opt-out wurden nicht hart genug als Pre-Submit-Thema behandelt.
- Release: `format:check`, AdMob-Test-IDs und leere EAS Submit IDs sind keine optionalen Details kurz vor Store Submit.

## Wo frühere Audits zu streng / inzwischen überholt waren

- Restore als Blocker ist überholt: Transaktion und Pre-Validation sind jetzt gut.
- Engine-Katalog-Abdeckung ist stärker als initial angenommen.
- Export/Bundling alter SQL-Import-Sorge ist aktuell grün.

## POST-LAUNCH-Klassifizierung

Weiterhin sinnvoll post-launch:

- Echter 3D-Globus.
- Vollständige Train-Catalog-Expansion.
- Timezone-aware duration.
- Device-Perf-Profiling für sehr große Journey-Listen.

Nicht post-launch, sondern pre-submit:

- Privacy Copy + Settings Persistenz.
- Production IDs/Submit-Konfig.
- Phase-1-Mode-Sichtbarkeit finalisieren.

