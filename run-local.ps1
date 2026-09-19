# CivicPulse AI — one-click local startup (Windows)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "== CivicPulse AI local startup ==" -ForegroundColor Cyan

# Backend
Push-Location "$root\backend"
if (-not (Test-Path .\venv\Scripts\python.exe)) {
    Write-Host "Creating backend venv + installing deps..." -ForegroundColor Yellow
    python -m venv venv
    .\venv\Scripts\python.exe -m pip install -q -r requirements.txt
}
Write-Host "Starting backend on http://localhost:8000 (docs at /docs)" -ForegroundColor Green
Start-Process -FilePath ".\venv\Scripts\python.exe" -ArgumentList "run.py" -WorkingDirectory "$root\backend"
Pop-Location

# Frontend
Push-Location "$root\frontend"
if (-not (Test-Path .\node_modules)) {
    Write-Host "Installing frontend deps..." -ForegroundColor Yellow
    npm install --no-audit --no-fund
}
Write-Host "Starting frontend on http://localhost:5173" -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/c npm run dev" -WorkingDirectory "$root\frontend"
Pop-Location

Write-Host ""
Write-Host "Open http://localhost:5173 in your browser. Backend API: http://localhost:8000/docs" -ForegroundColor Cyan
