# ============================================================================
# SnapPark Demo Launcher
# ============================================================================
# Starts backend + frontend + ngrok tunnel with one command.
# Usage:  .\demo.ps1
# Stop:   Press Ctrl+C (kills all child processes)
# ============================================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

# ── Fix PATH for this session ────────────────────────────────────────────────
$env:PATH = "C:\Program Files\nodejs;$env:APPDATA\npm;$env:LOCALAPPDATA\pnpm;$env:PATH"

# ── Helper: colored output ───────────────────────────────────────────────────
function Log($msg, $color = "Cyan") { Write-Host "[demo] $msg" -ForegroundColor $color }

# ── 1. Check prerequisites ──────────────────────────────────────────────────
Log "Checking prerequisites..."

# Python venv
$venvPython = Join-Path $ROOT ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Log "ERROR: Python venv not found at $venvPython" "Red"
    exit 1
}

# Node
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Log "ERROR: node not found. Install Node.js first." "Red"
    exit 1
}

# pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Log "Installing pnpm via npm..." "Yellow"
    npm install -g pnpm
}

# ngrok
if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Log "ngrok not found. Installing via npm..." "Yellow"
    npm install -g ngrok
    # Also try the standalone binary approach
    if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
        Log "Downloading ngrok binary..." "Yellow"
        $ngrokZip = Join-Path $env:TEMP "ngrok.zip"
        $ngrokDir = Join-Path $env:APPDATA "ngrok"
        Invoke-WebRequest -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows-amd64.zip" -OutFile $ngrokZip
        Expand-Archive -Path $ngrokZip -DestinationPath $ngrokDir -Force
        $env:PATH = "$ngrokDir;$env:PATH"
        Remove-Item $ngrokZip -ErrorAction SilentlyContinue
    }
}

if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
    Log "ERROR: Could not install ngrok. Download manually from https://ngrok.com/download" "Red"
    exit 1
}

# Check ngrok auth — create config dir if missing
$ngrokConfigDir = Join-Path $env:LOCALAPPDATA "ngrok"
if (-not (Test-Path $ngrokConfigDir)) {
    New-Item -ItemType Directory -Path $ngrokConfigDir -Force | Out-Null
}
$ngrokConfigFile = Join-Path $ngrokConfigDir "ngrok.yml"
if (-not (Test-Path $ngrokConfigFile)) {
    # Create a minimal config so ngrok doesn't error
    Set-Content -Path $ngrokConfigFile -Value "version: `"2`""
}

$needsAuth = $true
try {
    $configContent = Get-Content $ngrokConfigFile -Raw
    if ($configContent -match "authtoken:") { $needsAuth = $false }
} catch {}

if ($needsAuth) {
    Log "WARNING: ngrok authtoken not set." "Yellow"
    Log "Sign up free at https://ngrok.com/signup and copy your token from the dashboard." "Yellow"
    Log ""
    $token = Read-Host "Paste your ngrok authtoken here (or press Enter to skip)"
    if ($token) {
        ngrok config add-authtoken $token
    }
}

Log "All prerequisites OK." "Green"

# ── 2. Kill any existing processes on our ports ──────────────────────────────
Log "Clearing ports 5000 and 3000..."
foreach ($port in @(5000, 3000)) {
    $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
        $ErrorActionPreference = 'SilentlyContinue'
        taskkill /PID $procId /F 2>$null | Out-Null
        $ErrorActionPreference = 'Stop'
    }
}
Start-Sleep -Seconds 1

# ── 3. Start Flask backend ───────────────────────────────────────────────────
Log "Starting Flask backend on port 5000..."
$backendJob = Start-Job -ScriptBlock {
    param($root, $python)
    Set-Location (Join-Path $root "backend")
    & $python app.py 2>&1
} -ArgumentList $ROOT, $venvPython

# Wait for backend to be ready
Log "Waiting for backend to start..."
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 3
        if ($resp.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
}

if (-not $ready) {
    Log "ERROR: Backend failed to start. Check logs:" "Red"
    Receive-Job $backendJob
    exit 1
}
Log "Backend is running." "Green"

# ── 4. Build frontend (if needed) and start Express server ───────────────────
$frontendSrc = Join-Path $ROOT "frontend\src"
$distDir = Join-Path $frontendSrc "dist"

if (-not (Test-Path (Join-Path $distDir "index.html"))) {
    Log "Building frontend (first time)..."
    Push-Location $frontendSrc
    pnpm install 2>&1 | Out-Null
    pnpm build 2>&1
    Pop-Location
} else {
    Log "Frontend already built. (Run 'pnpm build' in frontend\src to rebuild)"
}

Log "Starting Express server on port 3000..."
$frontendJob = Start-Job -ScriptBlock {
    param($srcDir)
    Set-Location $srcDir
    $env:BACKEND_URL = "http://localhost:5000"
    $env:PORT = "3000"
    node server.js 2>&1
} -ArgumentList $frontendSrc

# Wait for frontend
Start-Sleep -Seconds 3
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
    Log "Frontend is running." "Green"
} catch {
    Log "WARNING: Frontend may still be starting..." "Yellow"
}

# ── 5. Start ngrok tunnel ───────────────────────────────────────────────────
Log "Starting ngrok tunnel..."
$ngrokExe = (Get-Command ngrok).Source
$ngrokJob = Start-Job -ScriptBlock {
    param($exe)
    & $exe http 3000 --log stdout 2>&1
} -ArgumentList $ngrokExe

# Wait for ngrok to establish tunnel and get the public URL
Start-Sleep -Seconds 4
try {
    $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 5
    $publicUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1).public_url
    if (-not $publicUrl) {
        $publicUrl = $tunnels.tunnels[0].public_url
    }
} catch {
    $publicUrl = "(check http://localhost:4040 for the URL)"
}

# ── 6. Print summary ────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  =============================================" -ForegroundColor Green
Write-Host "  SnapPark Demo is LIVE!" -ForegroundColor Green
Write-Host "  =============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Public URL:  $publicUrl" -ForegroundColor Yellow
Write-Host "  Local URL:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend:     http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "  ngrok UI:    http://localhost:4040" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Share the Public URL with anyone to demo!" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop everything." -ForegroundColor Gray
Write-Host ""

# ── 7. Keep alive until Ctrl+C ──────────────────────────────────────────────
try {
    while ($true) {
        # Check if jobs are still running
        if ($backendJob.State -eq "Failed") {
            Log "Backend crashed! Logs:" "Red"
            Receive-Job $backendJob
            break
        }
        if ($frontendJob.State -eq "Failed") {
            Log "Frontend crashed! Logs:" "Red"
            Receive-Job $frontendJob
            break
        }
        Start-Sleep -Seconds 5
    }
} finally {
    # Cleanup on Ctrl+C or exit
    Log "Shutting down..."
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Stop-Job $ngrokJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob, $frontendJob, $ngrokJob -Force -ErrorAction SilentlyContinue

    # Kill processes on ports
    foreach ($port in @(5000, 3000)) {
        $pids = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) { $ErrorActionPreference = 'SilentlyContinue'; taskkill /PID $procId /F 2>$null | Out-Null; $ErrorActionPreference = 'Stop' }
    }
    # Kill ngrok
    Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force

    Log "All stopped. Goodbye!" "Green"
}
