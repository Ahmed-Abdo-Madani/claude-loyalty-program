#!/usr/bin/env powershell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Loyalty Program Development Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Checking and stopping any existing processes on ports 3000 and 3001..." -ForegroundColor Yellow

# Function to kill processes on a specific port
function Kill-ProcessOnPort {
    param([int]$Port)

    $processes = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    foreach ($process in $processes) {
        $pid = $process.OwningProcess
        if ($pid -gt 0) {
            Write-Host "Stopping process $pid on port $Port" -ForegroundColor Red
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

# Kill existing processes
Kill-ProcessOnPort -Port 3000
Kill-ProcessOnPort -Port 3001

Write-Host ""
Write-Host "Starting Backend Server (Port 3001)..." -ForegroundColor Green

# Start backend server
$backendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Design_Bench_12\Documents\claude-loyalty-program\backend"
    npm start
}

Write-Host ""
Write-Host "Waiting 3 seconds for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Green

# Start frontend server
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "C:\Users\Design_Bench_12\Documents\claude-loyalty-program"
    $env:VITE_PORT = "3000"
    npm run dev
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Both servers are starting up!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:3001" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow

# Wait for jobs and display output
try {
    while ($true) {
        Start-Sleep -Seconds 1

        # Check if jobs are still running
        if ($backendJob.State -ne "Running" -and $frontendJob.State -ne "Running") {
            break
        }
    }
} finally {
    # Clean up jobs
    Write-Host "Stopping servers..." -ForegroundColor Red
    Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
}