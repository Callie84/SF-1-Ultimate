# SF-1 Backup - Windows Task Scheduler einrichten
# Dieses Script als Administrator ausführen (einmalig)

$taskName    = "SF1-Backup-Download"
$scriptPath  = "C:\SF1-Backups\backup-download.ps1"
$logPath     = "C:\SF1-Backups"

# Verzeichnis anlegen
New-Item -ItemType Directory -Path $logPath -Force | Out-Null

# Script dorthin kopieren (passe den Quellpfad an)
# Copy-Item ".\backup-download.ps1" $scriptPath

# Task-Definition: jeden Sonntag um 10:00 Uhr
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "10:00AM"

# Nur ausführen wenn Netzwerk vorhanden (damit es funktioniert wenn Rechner an ist)
$trigger.ExecutionTimeLimit = "PT1H"  # Max 1 Stunde

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""

$settings = New-ScheduledTaskSettingsSet `
    -RunOnlyIfNetworkAvailable `
    -StartWhenAvailable `       # Nachholen falls Rechner um 10 Uhr aus war
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -MultipleInstances IgnoreNew

# Task registrieren (läuft als aktueller Benutzer)
Register-ScheduledTask `
    -TaskName $taskName `
    -Trigger $trigger `
    -Action $action `
    -Settings $settings `
    -RunLevel Highest `
    -Force

Write-Host ""
Write-Host "Task '$taskName' wurde eingerichtet!"
Write-Host "Laeuft jeden Sonntag um 10:00 Uhr."
Write-Host "Falls der Rechner um 10 Uhr aus war, wird der Task beim naechsten Start nachgeholt."
Write-Host ""
Write-Host "Manuell starten: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "Log anzeigen:    Get-Content C:\SF1-Backups\backup-log.txt -Tail 50"
