param()

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Get-PythonCommand {
  $candidates = @(
    "services/stt/.venv/Scripts/python.exe",
    "python",
    "py"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -like "*python.exe" -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
      return $candidate
    }
  }
  throw "Python not found. Install Python 3.10+ and set up services/stt/.venv"
}

$pythonCmd = Get-PythonCommand
Write-Host "Starting STT service with: $pythonCmd"
$sttProc = Start-Process -FilePath $pythonCmd -ArgumentList @("-m","uvicorn","app:app","--host","0.0.0.0","--port","8001") -WorkingDirectory "services/stt" -PassThru

Start-Sleep -Seconds 2

try {
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm --filter @opentutor/whatsapp dev
  } else {
    npm run dev --workspace=@opentutor/whatsapp
  }
} finally {
  if ($sttProc -and -not $sttProc.HasExited) {
    Write-Host "Stopping STT service..."
    Stop-Process -Id $sttProc.Id -Force
  }
}
