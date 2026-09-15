Write-Host "Starting Route Radar Demo..."

# Get the directory where this script lives
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir  = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$EdgeSimDir  = Join-Path $ProjectRoot "edge_sim"

# 1. Start Backend
Write-Host "Starting Backend API (FastAPI on port 8000)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pip install -r requirements.txt; uvicorn main:app --reload" -WorkingDirectory $BackendDir

# 2. Start Frontend
Write-Host "Starting Frontend (Vite on port 5173)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm install; npm run dev" -WorkingDirectory $FrontendDir

# 3. Wait for servers to start
Write-Host "Waiting 15s for servers to initialize..."
Start-Sleep -Seconds 15

# 4. Start Edge Simulation (Inference)
Write-Host "Starting Edge Simulation (Inference Pipeline)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pip install -r requirements.txt; python inference.py" -WorkingDirectory $EdgeSimDir

Write-Host ""
Write-Host "All processes started in separate windows."
Write-Host "Open http://localhost:5173 to view the dashboard."
