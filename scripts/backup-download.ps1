# SF-1 Ultimate - Wöchentlicher Backup-Download
# Speichern unter: C:\SF1-Backups\backup-download.ps1
# Einrichten per Windows Task Scheduler (Anleitung unten)

# ============================================================
# KONFIGURATION - hier anpassen falls nötig
# ============================================================
$SERVER      = "root@seedfinderpro.de"
$REMOTE_DIR  = "/root/SF-1-Ultimate-/backups"
$LOCAL_DIR   = "C:\SF1-Backups\downloads"
$LOG_FILE    = "C:\SF1-Backups\backup-log.txt"
$KEEP_LOCAL  = 4   # Wie viele Backups lokal behalten (ältere werden gelöscht)
# ============================================================

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    Add-Content -Path $LOG_FILE -Value $line -Encoding UTF8
    Write-Host $line
}

function Show-Notification {
    param([string]$Title, [string]$Message, [bool]$IsError = $false)
    try {
        $icon = if ($IsError) { "Error" } else { "Info" }
        Add-Type -AssemblyName System.Windows.Forms
        $notify = New-Object System.Windows.Forms.NotifyIcon
        $notify.Icon = [System.Drawing.SystemIcons]::$icon
        $notify.BalloonTipTitle = $Title
        $notify.BalloonTipText = $Message
        $notify.Visible = $true
        $notify.ShowBalloonTip(8000)
        Start-Sleep -Seconds 2
        $notify.Dispose()
    } catch {
        # Notification nicht kritisch, ignorieren
    }
}

# Verzeichnis anlegen falls nicht vorhanden
if (-not (Test-Path $LOCAL_DIR)) {
    New-Item -ItemType Directory -Path $LOCAL_DIR -Force | Out-Null
}
if (-not (Test-Path (Split-Path $LOG_FILE))) {
    New-Item -ItemType Directory -Path (Split-Path $LOG_FILE) -Force | Out-Null
}

Write-Log "===== Backup-Download gestartet ====="

# 1. Neuestes Backup vom Server ermitteln
Write-Log "Ermittle neuestes Backup auf dem Server..."
$latestBackup = ssh $SERVER "ls -1t $REMOTE_DIR/*.tar.gz 2>/dev/null | head -1"

if (-not $latestBackup) {
    Write-Log "FEHLER: Kein Backup auf dem Server gefunden!" "ERROR"
    Show-Notification "SF-1 Backup FEHLER" "Kein Backup auf dem Server gefunden!" $true
    exit 1
}

$backupFile = Split-Path $latestBackup -Leaf
$metaFile   = $backupFile -replace "\.tar\.gz$", ".meta.json"

Write-Log "Neuestes Backup: $backupFile"

# 2. Prüfen ob dieses Backup bereits lokal vorhanden
$localBackupPath = Join-Path $LOCAL_DIR $backupFile
if (Test-Path $localBackupPath) {
    Write-Log "Backup $backupFile ist bereits lokal vorhanden - kein Download nötig."
    Write-Log "===== Fertig (kein neues Backup) ====="
    exit 0
}

# 3. Backup + Meta herunterladen
Write-Log "Lade $backupFile herunter..."
$downloadStart = Get-Date

scp "${SERVER}:${REMOTE_DIR}/${backupFile}" $LOCAL_DIR
if ($LASTEXITCODE -ne 0) {
    Write-Log "FEHLER: Download von $backupFile fehlgeschlagen!" "ERROR"
    Show-Notification "SF-1 Backup FEHLER" "Download fehlgeschlagen!" $true
    exit 1
}

scp "${SERVER}:${REMOTE_DIR}/${metaFile}" $LOCAL_DIR 2>$null
# Meta ist optional, kein Fehler wenn nicht vorhanden

$downloadSeconds = [int](New-TimeSpan -Start $downloadStart -End (Get-Date)).TotalSeconds
Write-Log "Download abgeschlossen in ${downloadSeconds}s"

# 4. Integrität prüfen (tar -tzf listet Inhalt ohne zu entpacken)
Write-Log "Prüfe Backup-Integrität..."
$localBackupPath = Join-Path $LOCAL_DIR $backupFile

$tarOutput = tar -tzf $localBackupPath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Log "FEHLER: Backup-Datei ist beschädigt! tar-Fehler: $tarOutput" "ERROR"
    # Beschädigte Datei löschen
    Remove-Item $localBackupPath -Force
    Show-Notification "SF-1 Backup FEHLER" "Backup-Datei ist beschädigt und wurde geloescht!" $true
    exit 1
}

$fileCount = ($tarOutput | Measure-Object -Line).Lines
Write-Log "Integrität OK - $fileCount Dateien im Archiv"

# 5. Dateigröße loggen
$sizeKB = [int]((Get-Item $localBackupPath).Length / 1KB)
Write-Log "Backup-Größe: ${sizeKB} KB"

# 6. Meta-Datei auslesen und Details loggen
$localMetaPath = Join-Path $LOCAL_DIR $metaFile
if (Test-Path $localMetaPath) {
    try {
        $meta = Get-Content $localMetaPath -Encoding UTF8 | ConvertFrom-Json
        Write-Log "Backup-Zeitstempel: $($meta.createdAt)"
        Write-Log "Backup-Status: $($meta.status)"
    } catch {
        Write-Log "Meta-Datei konnte nicht gelesen werden (unkritisch)" "WARN"
    }
}

# 7. Alte lokale Backups aufräumen (nur $KEEP_LOCAL behalten)
Write-Log "Räume alte lokale Backups auf (behalte die letzten $KEEP_LOCAL)..."
$allLocalBackups = Get-ChildItem -Path $LOCAL_DIR -Filter "*.tar.gz" | Sort-Object LastWriteTime -Descending
if ($allLocalBackups.Count -gt $KEEP_LOCAL) {
    $toDelete = $allLocalBackups | Select-Object -Skip $KEEP_LOCAL
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        $oldMeta = $old.FullName -replace "\.tar\.gz$", ".meta.json"
        if (Test-Path $oldMeta) { Remove-Item $oldMeta -Force }
        Write-Log "Altes Backup gelöscht: $($old.Name)"
    }
}

# 8. Erfolgsmeldung
$remaining = (Get-ChildItem -Path $LOCAL_DIR -Filter "*.tar.gz").Count
Write-Log "Backup erfolgreich! Lokale Backups gespeichert: $remaining"
Write-Log "===== Backup-Download abgeschlossen ====="

Show-Notification "SF-1 Backup erfolgreich" "Backup $backupFile heruntergeladen und geprüft (${sizeKB} KB)" $false
