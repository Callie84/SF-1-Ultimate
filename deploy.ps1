# ==========================================
# SF-1 DEPLOYMENT SCRIPT
# Netcup Server: 152.53.252.68
# Stand: 03.11.2025
# ==========================================

$SERVER_IP = "152.53.252.68"
$SERVER_USER = "root"
$PROJECT_PATH = "C:\--Projekte--\sf1-ultimate"
$SERVER_TARGET = "/opt/sf1-ultimate"

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SF-1 DEPLOYMENT ZU NETCUP SERVER" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ==========================================
# SCHRITT 1: PROJEKT HOCHLADEN
# ==========================================

Write-Host "[1/5] Uploade Projekt zum Server..." -ForegroundColor Cyan

# Erstelle Zielverzeichnis auf Server
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p $SERVER_TARGET"

# Upload Docker Compose + ENV
Write-Host "  - Uploade docker-compose.yml..." -ForegroundColor Gray
scp "$PROJECT_PATH\docker-compose.yml" ${SERVER_USER}@${SERVER_IP}:${SERVER_TARGET}/

Write-Host "  - Uploade .env..." -ForegroundColor Gray
scp "$PROJECT_PATH\.env" ${SERVER_USER}@${SERVER_IP}:${SERVER_TARGET}/

# Upload Apps-Ordner (alle 11 Services)
Write-Host "  - Uploade alle Services..." -ForegroundColor Gray
scp -r "$PROJECT_PATH\apps" ${SERVER_USER}@${SERVER_IP}:${SERVER_TARGET}/

Write-Host "  ✓ Upload abgeschlossen!" -ForegroundColor Green
Write-Host ""

# ==========================================
# SCHRITT 2: VERZEICHNIS-RECHTE SETZEN
# ==========================================

Write-Host "[2/5] Setze Berechtigungen..." -ForegroundColor Cyan

ssh ${SERVER_USER}@${SERVER_IP} @"
cd $SERVER_TARGET
chmod 600 .env
chmod -R 755 apps/
"@

Write-Host "  ✓ Berechtigungen gesetzt!" -ForegroundColor Green
Write-Host ""

# ==========================================
# SCHRITT 3: ALTE CONTAINER STOPPEN
# ==========================================

Write-Host "[3/5] Stoppe alte Container..." -ForegroundColor Cyan

ssh ${SERVER_USER}@${SERVER_IP} @"
cd $SERVER_TARGET
docker-compose down 2>/dev/null || true
"@

Write-Host "  ✓ Alte Container gestoppt!" -ForegroundColor Green
Write-Host ""

# ==========================================
# SCHRITT 4: DOCKER COMPOSE STARTEN
# ==========================================

Write-Host "[4/5] Starte SF-1 Services..." -ForegroundColor Cyan
Write-Host "  (Das kann 2-3 Minuten dauern...)" -ForegroundColor Yellow

ssh ${SERVER_USER}@${SERVER_IP} @"
cd $SERVER_TARGET
docker-compose up -d
"@

Write-Host "  ✓ Services gestartet!" -ForegroundColor Green
Write-Host ""

# ==========================================
# SCHRITT 5: HEALTH-CHECK
# ==========================================

Write-Host "[5/5] Prüfe Service-Status..." -ForegroundColor Cyan
Write-Host "  (Warte 10 Sekunden auf Startup...)" -ForegroundColor Yellow

Start-Sleep -Seconds 10

ssh ${SERVER_USER}@${SERVER_IP} @"
cd $SERVER_TARGET
docker-compose ps
"@

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "NÄCHSTE SCHRITTE:" -ForegroundColor Yellow
Write-Host "1. Prüfe Logs: ssh root@$SERVER_IP 'cd $SERVER_TARGET && docker-compose logs -f'" -ForegroundColor White
Write-Host "2. Teste API: curl http://${SERVER_IP}/api/auth/health" -ForegroundColor White
Write-Host "3. Frontend konfigurieren (NEXT_PUBLIC_API_URL=http://${SERVER_IP})" -ForegroundColor White
Write-Host ""
