# Open Web UI — Admin-Setup & Ollama-Integration

**URL:** http://localhost:8081

## 1️⃣ Admin-User erstellen

1. Öffne http://localhost:8081 im Browser
2. Seite sollte "Sign Up" zeigen
3. Fülle aus:
   - **Name:** Admin
   - **Email:** admin@sf1.local (oder deine Email)
   - **Password:** Wähle sicheres Passwort (mind. 8 Zeichen)
   - **Confirm Password:** Wiederholen
4. Klick "Sign Up"
5. Du solltest eingeloggt sein → Dashboard mit "Ollama" Icon

## 2️⃣ Ollama als Backend verbinden

1. Klick oben rechts auf **Einstellungen** (Zahnrad-Icon)
2. Geh zu **"Settings"** → **"Models"** oder **"Admin Settings"**
3. Suche **"Ollama"** oder **"Model Configuration"**
4. Trage ein:
   - **Base URL:** `http://ollama:11434`
   - Oder aus Docker-Perspektive: `http://sf1-ollama:11434` (funktioniert auch)
5. Klick **"Test Connection"** oder **"Save"**
6. Modelle sollten geladen werden: `qwen2.5:7b`

## 3️⃣ Model wählen & Test-Anfrage

1. Hauptseite sollte jetzt **qwen2.5:7b** in der Model-Liste zeigen
2. Schreibe eine Test-Frage:
   ```
   Was ist Cannabis Züchtung? Kurz zusammengefasst.
   ```
3. Sende die Nachricht (Enter oder Send-Button)
4. Ollama sollte antworten (dauert ~30 Sekunden beim ersten Mal)

## 4️⃣ Verify Integration

Wenn alles funktioniert:
- ✅ Modell ist wählbar
- ✅ Antworten werden generiert
- ✅ Keine Fehler in Logs

## Troubleshooting

### "Connection refused to http://ollama:11434"
- URL sollte sein: `http://ollama:11434` (Docker-Netzwerk-Name)
- NICHT: `http://localhost:11434` (das ist Host-Port, nicht Container-Port)

### "No models available"
- Überprüfe: `docker exec sf1-ollama ollama list`
- Sollte `qwen2.5:7b` anzeigen
- Falls nicht: `docker exec sf1-ollama ollama pull qwen2.5:7b`

### Admin-User "wurde nicht erstellt"
- Logs prüfen: `docker logs sf1-open-webui 2>&1 | tail -30`
- Datenbankfehler? Versuche Fresh Setup: `docker-compose down -v && docker-compose up -d`

## API-Test (nur für Debugging)

```bash
# Health-Check
curl http://localhost:8081/api/health

# Models auflisten (nach Ollama-Config)
curl http://localhost:8081/api/models
```

---

**Nach Setup abgeschlossen → Task #8 kann als "completed" markiert werden!**
