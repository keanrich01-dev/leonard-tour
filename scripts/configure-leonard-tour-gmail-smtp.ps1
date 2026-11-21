[CmdletBinding()]
param(
    [string]$ProjectPath = "$HOME\Documents\leonard-tour",
    [string]$AdminEmail = ""
)

$ErrorActionPreference = "Stop"
$envPath = Join-Path $ProjectPath "backend\.env"
if (-not (Test-Path $envPath)) {
    throw "Backend .env haijapatikana: $envPath"
}

Write-Host "Leonard Tour - Gmail SMTP setup" -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
    $AdminEmail = (Read-Host "Weka email ya kampuni itakayopokea booking notifications").Trim()
}
if ($AdminEmail -notmatch '^[^\s@]+@[^\s@]+\.[^\s@]+$') { throw "Admin notification email si sahihi." }
Write-Host "Admin notification recipient: $AdminEmail"
$sender = (Read-Host "Weka Gmail address itakayotuma email (mfano business@gmail.com)").Trim()
if ($sender -notmatch '^[^\s@]+@gmail\.com$') {
    throw "Tafadhali tumia Gmail address halali inayoishia @gmail.com."
}
Write-Host "Tengeneza App Password mpya kwenye Google Account > Security > 2-Step Verification > App passwords." -ForegroundColor Yellow
Write-Host "Usitumie password ya kawaida ya Gmail, na usitume App Password kwenye chat." -ForegroundColor Yellow
$securePassword = Read-Host "Ingiza Gmail App Password mpya (itaonekana ikiwa imefichwa)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $appPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) -replace '\s', ''
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
if ($appPassword.Length -lt 16) {
    throw "App Password haionekani kuwa kamili. Hakuna mabadiliko yaliyofanywa."
}

$backupDir = Join-Path $ProjectPath ("backups\email-smtp-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Copy-Item -LiteralPath $envPath -Destination (Join-Path $backupDir '.env') -Force

$lines = [System.Collections.Generic.List[string]]::new()
foreach ($line in [System.IO.File]::ReadAllLines($envPath)) { $lines.Add($line) }
function Set-EnvValue([string]$Key, [string]$Value) {
    $pattern = '^\s*' + [regex]::Escape($Key) + '\s*='
    $found = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match $pattern) { $found = $i; break }
    }
    $newLine = "$Key=$Value"
    if ($found -ge 0) { $lines[$found] = $newLine } else { $lines.Add($newLine) }
}

Set-EnvValue 'EMAIL_BACKEND' 'smtp'
Set-EnvValue 'SMTP_HOST' 'smtp.gmail.com'
Set-EnvValue 'SMTP_PORT' '587'
Set-EnvValue 'SMTP_USER' $sender
Set-EnvValue 'SMTP_PASSWORD' $appPassword
Set-EnvValue 'SMTP_STARTTLS' 'true'
Set-EnvValue 'SMTP_SSL' 'false'
Set-EnvValue 'EMAIL_FROM' $sender
Set-EnvValue 'EMAIL_FROM_NAME' 'Leonard Tour'
Set-EnvValue 'ADMIN_NOTIFY_EMAILS' $AdminEmail

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllLines($envPath, $lines, $utf8NoBom)
$appPassword = $null
$securePassword.Dispose()
Write-Host "SMTP CONFIGURED. Secret saved only in backend\.env." -ForegroundColor Green
Write-Host "Backup: $backupDir"
Write-Host "Next: restart FastAPI, then run the test command below from the project root:" -ForegroundColor Cyan
Write-Host '  Set-Location "$HOME\Documents\leonard-tour\backend"'
Write-Host '  $py = if (Test-Path ".\.venv\Scripts\python.exe") { ".\.venv\Scripts\python.exe" } elseif (Test-Path "..\.venv\Scripts\python.exe") { "..\.venv\Scripts\python.exe" } else { "python" }'
Write-Host '  & $py scripts\test_smtp_email.py'
