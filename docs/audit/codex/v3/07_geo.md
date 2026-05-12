# 07 — Geo Library

## Verdict

Für Flight-Phase-1 ausreichend, mit einem echten, aber aktuell kaum genutzten Bug in `bezierPath()` über die Date Line.

## Korrekt

- `haversineDistance()` ist mathematisch robust; IDL-Distanzen wie NRT-LAX bleiben korrekt, weil Haversine mit großem ΔLng trotzdem den kurzen Bogen berechnet (`src/lib/geo/index.ts:18`).
- `greatCirclePath()` nutzt sphärische Interpolation und liefert gewünschte Sample-Anzahl inklusive Endpunkten (`src/lib/geo/index.ts:81`).
- Polar-Circle-Erkennung sampelt Great Circle mit 64 Punkten (`src/lib/geo/index.ts:61`).

## Edge Cases / Limits

- `crossesEquator()` zählt nur strikten Seitenwechsel; Start/Ziel exakt am Äquator zählt nicht (`src/lib/geo/index.ts:39`). Das kann okay sein, ist aber nicht dokumentiert.
- `crossesAtlantic()` ist eine grobe Längengrad-Heuristik (`src/lib/geo/index.ts:43`). Sie trifft FRA-JFK, aber nicht jede reale Atlantic-Route.
- `crossesPacific()` bedeutet aktuell "kurzer Bogen kreuzt Antimeridian" (`src/lib/geo/index.ts:56`). Für NRT-LAX gut, aber semantisch nicht jede Pacific-Route.
- `greatCirclePath()` normalisiert Longitudes nicht vor dem Output. NRT-LAX springt z.B. von `167.3` auf `-176.6`; Map-Renderer müssen das sauber splitten.

## Bug

`bezierPath()` berechnet `dLng` als kurze Richtung, interpoliert dann aber zum rohen `b.longitude` (`src/lib/geo/index.ts:122`). Beispiel NRT-LAX erzeugt Punkte wie:

`35.8,140.4 | 22.8,147.6 | 14.1,140.1 | 9.6,117.8 | 9.4,80.8 | 13.3,29.2 | 21.5,-37.3 | 33.9,-118.4`

Das ist visuell Asien/Afrika/Atlantik statt Pacific. Aktuell nutzt Flight `great_circle`; Train/Other sind Phase-1 nicht primär. Severity P3.

