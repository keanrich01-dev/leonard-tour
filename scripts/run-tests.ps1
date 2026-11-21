$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$secure = Read-Host "Password for the dedicated local PostgreSQL test role 'leonard_tour_test'" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $env:LEONARD_TEST_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:LEONARD_TEST_DB_USER = "leonard_tour_test"
    $env:LEONARD_TEST_DB_NAME = "leonard_tour_test_db"
    Set-Location (Join-Path $root "backend")
    & (Join-Path $root ".venv\Scripts\python.exe") -m pytest -q
    if ($LASTEXITCODE -ne 0) { throw "pytest failed with exit code $LASTEXITCODE" }
}
finally {
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    Remove-Item Env:LEONARD_TEST_DB_PASSWORD -ErrorAction SilentlyContinue
}
