param()

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

Write-Host "OpenTutor setup (Windows)" -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example"
} else {
  Write-Host ".env already exists (keeping current file)"
}

$dirs = @("data", "tmp", "sessions", "services/tts/voices", "tools/ffmpeg")
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Force -Path $d | Out-Null
}

if (Get-Command pnpm -ErrorAction SilentlyContinue) {
  Write-Host "Installing Node dependencies with pnpm..."
  pnpm install
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
  Write-Host "pnpm not found. Installing with npm (workspace support may be slower)."
  npm install
} else {
  Write-Host "Node package manager not found. Install Node.js 20+ and pnpm." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Manual dependencies still required:" -ForegroundColor Yellow
Write-Host "1) Install Ollama and run: ollama pull llama3.1"
Write-Host "2) Install ffmpeg and either:"
Write-Host "   - put ffmpeg.exe in PATH, OR"
Write-Host "   - place ffmpeg.exe at .\\tools\\ffmpeg\\ffmpeg.exe (auto-detected)"
Write-Host "3) Install Piper binary and ensure 'piper' is in PATH (or set PIPER_BIN)"
Write-Host "4) Download a Piper voice: .\\scripts\\download-piper-voice.ps1"
Write-Host "5) Create Python venv for STT and install requirements:"
Write-Host "   cd services\\stt; python -m venv .venv; . .venv\\Scripts\\Activate.ps1; pip install -r requirements.txt"
Write-Host ""
Write-Host "Then run: pnpm dev"
