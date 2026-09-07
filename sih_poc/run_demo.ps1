Write-Host "Starting SIH PS124 Phase 1 Demo..."

# 1. Start Backend
Write-Host "Starting Backend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; pip install -r requirements.txt; uvicorn main:app --reload"

# 2. Start Frontend
Write-Host "Starting Frontend..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install; npm install tailwindcss @tailwindcss/postcss postcss autoprefixer react-leaflet leaflet; npm run dev"

# 3. Wait a bit for servers to start
Start-Sleep -Seconds 15

# 4. Start Edge Simulation
Write-Host "Starting Edge Simulation (Inference)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd edge_sim; pip install -r requirements.txt; python download_sample.py; python inference.py"

Write-Host "All processes started in separate windows."
Write-Host "Open http://localhost:5173 to view the dashboard."
