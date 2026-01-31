# LESSONS LEARNED: TypeScript @types Deployment Problem
**Datum:** 2026-01-25
**Schweregrad:** KRITISCH
**Status:** NICHT GELÖST

## Problem
Services mit ts-node-dev crashen: "Could not find declaration file for module 'express'"

## Root Cause
`sh -c "cmd1 && cmd2"` in docker-compose.yml ist unzuverlässig - nur ERSTER Befehl läuft!

## Fehlgeschlagene Versuche (2 Stunden)
1. Host npm install → Container sieht es nicht
2. docker exec → Bei restart weg
3. docker-compose command erweitern → Zweiter Befehl läuft nicht
4. sed escaping → Pattern matched nicht
5. Neues docker-compose.yml → Gleiches Problem
6. Shell-Scripts → In Testing

## Lessons Learned
- REGEL 1: npm install auf Host hat keine Wirkung auf Container
- REGEL 2: docker exec ist ephemeral
- REGEL 3: sh -c "cmd1 && cmd2 && cmd3" ist UNZUVERLÄSSIG
- REGEL 4: Nach 3 Fehlversuchen → Root Cause neu analysieren

## Richtige Lösung
1. @types in package.json auf Host installieren
2. Container neu bauen
3. ODER: tsx statt ts-node-dev verwenden
