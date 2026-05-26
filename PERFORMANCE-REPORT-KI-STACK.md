# SF-1 KI-Stack Performance Report

**Datum:** 2026-04-09  
**Test-Umgebung:** Netcup RS1000 SE (CPU-only, keine GPU)

---

## 📊 Baseline (Ruhezustand)

| Service | CPU % | Memory |
|---------|-------|--------|
| **Ollama** | 0.00% | 153.8 MiB |
| **RAG-Service** | 0.00% | 25.3 MiB |
| **Open Web UI** | 0.18% | 556.8 MiB |
| **n8n** | 0.00% | 100.9 MiB |
| **TOTAL** | ~0.2% | 836.8 MiB (≈0.8 GB von 7.75 GB) |

✅ **Footprint klein** — KI-Stack belegt < 1 GB (ohne Strain-Datenbank, ohne Production-Services)

---

## ⚡ Latenz-Test (Single Request)

### Ollama Generate (qwen2.5:7b)
```
Anfrage: "Hi"
Zeit:    1m52s (112 Sekunden)
Output:  5 Zeichen (kurze Antwort)
```

**Interpretation:**
- ⚠️ **Sehr langsam** für CPU-only
- Erwartbar: 7B Modell, Q4-Quantisierung, kein GPU
- Für längere Responses: > 2-3 Minuten
- **Real-World Nutzen:** Async/Background-Tasks nötig, nicht synchron im Request-Path

### Empfehlung
- Nutze Ollama nur für **asynchrone Tasks** (n8n, Background-Worker)
- Nicht für **synchrone Web-APIs** (würde zu Timeouts führen)
- Cache Responses wenn möglich (Redis)

---

## 🔥 Load-Test (5 parallel requests)

### Nach concurrent Generation:
- **Ollama CPU:** 30.88% (Single-Core oder Multi-Core spikes)
- **Ollama Memory:** 265.2 MiB (up from 153.8 MiB)
- **Delta:** +111.4 MiB RAM bei 5 Requests

**Bottleneck:** CPU ist der Limiter (nur 1-2 Cores aktiv bei Ollama)

### Skalierungs-Limit (geschätzt)
- Max ~10-15 concurrent requests bevor Queue überlastet
- Danach: Timeouts, Memory-Druck

---

## 💾 Memory-Analyse

### Komponenten
```
Baseline:        836.8 MiB
+ Ollama (idle): 153.8 MiB
+ RAG-Service:    25.3 MiB
+ Web UI:        556.8 MiB
+ n8n:           100.9 MiB
────────────────────────────
Total:           ~837 MiB = 0.8 GB
```

Verfügbar: 7.75 GB → 90% Headroom

### Model-Größe
- `qwen2.5:7b`: 4.68 GB (geladen im Speicher)
- Weitere 7B-Modelle: +4.68 GB pro Modell

**Limitation:** Max ~1-2 weitere Modelle parallel lade  (würde auf ~9-10 GB gehen)

---

## 🔋 CPU-Analyse

### Single-Request Nutzung
- Während Inference: ~1-2 Cores @ 100% (sollte multi-thread sein)
- Rest idle

### Concurrent-Request Nutzung  
- 30.88% über alle Cores
- Deutet auf Queue-basierte Verarbeitung hin
- Ollama limitiert Parallelität (via `OLLAMA_NUM_PARALLEL`)

---

## 🎯 Optimierungs-Potenzial

### Schnell (einfach)
- [ ] `OLLAMA_CONTEXT_LENGTH` ↑ auf 8192 (aus default 4096)
- [ ] `OLLAMA_NUM_PARALLEL` ↑ auf 2-4 (vs. default 1)
- [ ] Response-Caching in RAG-Service (Redis)
- [ ] Smaller Models testen (3B-Modelle sind schneller)

### Mittelfristig (aufwändig)
- [ ] Quantisierung tiefer (GGUF Q3 statt Q4)
- [ ] Fine-tuned Cannabis-Modell (spezialisiert = schneller)
- [ ] LLaMA 2 7B testen (alternativ zu Qwen)

### Langfristig (infrastruktur)
- [ ] GPU-Server für Inferenz (10-100x schneller)
- [ ] Separate Inference-Container (vs. co-located)
- [ ] Load-Balancer für Models (round-robin)

---

## 📈 Monitoring-Empfehlungen

```bash
# Watch real-time während Load:
watch docker stats sf1-ollama

# Monitor Ollama logs:
docker logs -f sf1-ollama | grep -i "generating\|load"

# Measure latency per request:
time curl http://localhost:11435/api/generate ...
```

---

## ✅ Fazit

| Aspekt | Status | Notes |
|--------|--------|-------|
| **Funktionalität** | ✅ OK | Alle Services laufen, können miteinander reden |
| **Latenz** | ⚠️ Langsam | ~2 min/request (CPU-only expected) |
| **Memory** | ✅ OK | 0.8 GB baseline, Headroom für weitere Models |
| **CPU** | ⚠️ Bottleneck | Single-thread Ollama, keine GPU |
| **Scalability** | ⚠️ Begrenzt | Max 10-15 concurrent requests |
| **Production-Ready** | ⚠️ Mit Caveats | Nur async Tasks, nicht für Echtzeit-API |

### Empfehlung für Phase 3 (Production-Migration)
1. **Async-First Architektur:** Nutze n8n/Background-Queue für KI-Aufgaben
2. **Caching:** Redis für häufige Anfragen
3. **Fallback:** OpenAI/OpenRouter für kritische, schnelle Requests
4. **Monitoring:** Prometheus + Loki für Latenz-Tracking

---

**Generiert:** 2026-04-09 11:45 UTC
