param(
  [string]$VoiceName = "en_US-lessac-medium"
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$outDir = "services/tts/voices"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

switch ($VoiceName) {
  "en_US-lessac-medium" {
    $base = "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/lessac/medium"
    $files = @(
      @{ Name = "en_US-lessac-medium.onnx"; Url = "$base/en_US-lessac-medium.onnx" },
      @{ Name = "en_US-lessac-medium.onnx.json"; Url = "$base/en_US-lessac-medium.onnx.json" }
    )
  }
  default {
    throw "Unsupported preset voice '$VoiceName'. Edit this script or download manually."
  }
}

foreach ($f in $files) {
  $dest = Join-Path $outDir $f.Name
  Write-Host "Downloading $($f.Name)..."
  Invoke-WebRequest -Uri $f.Url -OutFile $dest
}

Write-Host "Voice downloaded to $outDir"
