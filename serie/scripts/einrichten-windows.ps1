# Einrichtung „Gestrandet in Japan“ auf Windows – einmal ausführen (PowerShell, kein Admin nötig).
# Installiert Git, Node.js, ffmpeg (winget), klont/aktualisiert kotoba-dojo nach Dokumente\Projekte,
# installiert die Pakete, VOICEVOX (Installer), whisper.cpp + Sprachmodell.
# Mehrfach ausführen schadet nicht: Vorhandenes wird übersprungen bzw. aktualisiert.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # macht Downloads deutlich schneller
$branch = 'ccr-0b3bf917-4jzi1j'
$ziel = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Projekte'
$repo = Join-Path $ziel 'kotoba-dojo'
$werkzeuge = Join-Path $repo 'serie\werkzeuge'

function Installiere($befehl, $id) {
  if (Get-Command $befehl -ErrorAction SilentlyContinue) { Write-Host "✓ $befehl ist schon da"; return }
  Write-Host "→ installiere $id …"
  winget install --id $id -e --accept-source-agreements --accept-package-agreements --silent
}
function PfadNeu { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw 'winget fehlt. Bitte im Microsoft Store „App-Installer“ installieren und das Skript erneut starten.'
}
Installiere git 'Git.Git'
Installiere node 'OpenJS.NodeJS.LTS'
Installiere ffmpeg 'Gyan.FFmpeg'
PfadNeu

# --- Projekt holen ---
New-Item -ItemType Directory -Force -Path $ziel | Out-Null
if (Test-Path (Join-Path $repo '.git')) {
  Write-Host '→ Repo vorhanden, hole neuesten Stand …'
  git -C $repo fetch origin $branch
  git -C $repo checkout $branch
  git -C $repo pull --ff-only origin $branch
} else {
  Write-Host '→ klone kotoba-dojo …'
  git clone -b $branch https://github.com/TheTobf/kotoba-dojo.git $repo
}
Push-Location $repo
npm ci --no-audit --no-fund
Pop-Location
Push-Location (Join-Path $repo 'serie')
npm ci --no-audit --no-fund
Pop-Location
New-Item -ItemType Directory -Force -Path $werkzeuge | Out-Null

# --- VOICEVOX (kostenlos, lokal) ---
$vvEngine = Join-Path $env:LOCALAPPDATA 'Programs\VOICEVOX\vv-engine\run.exe'
if (Test-Path $vvEngine) { Write-Host '✓ VOICEVOX ist schon installiert' } else {
  Write-Host '→ lade VOICEVOX-Installer (GitHub) …'
  $rel = Invoke-RestMethod 'https://api.github.com/repos/VOICEVOX/voicevox/releases/latest' -Headers @{ 'User-Agent' = 'serie-einrichtung' }
  # DirectML-Version (nutzt die Grafikkarte, läuft aber auch ohne); sonst CPU-Version
  $asset = $rel.assets | Where-Object { $_.name -match '^VOICEVOX\.Web\.Setup.*\.exe$' } | Select-Object -First 1
  if (-not $asset) { $asset = $rel.assets | Where-Object { $_.name -match 'Setup.*\.exe$' } | Select-Object -First 1 }
  if (-not $asset) {
    Write-Host '⚠ Installer nicht gefunden. Bitte VOICEVOX manuell installieren: https://voicevox.hiroshiba.jp/' -ForegroundColor Yellow
  } else {
    $exe = Join-Path $env:TEMP $asset.name
    Invoke-WebRequest $asset.browser_download_url -OutFile $exe
    Write-Host '→ VOICEVOX-Installer startet – bitte durchklicken (Standard-Einstellungen sind ok).'
    Start-Process -FilePath $exe -Wait
  }
}

# --- whisper.cpp (Spracherkennung für die Zeitmarken, MIT-Lizenz) ---
$wOrdner = Join-Path $werkzeuge 'whisper'
New-Item -ItemType Directory -Force -Path $wOrdner | Out-Null
if (-not (Get-ChildItem $wOrdner -Recurse -Filter 'whisper-cli.exe' -ErrorAction SilentlyContinue)) {
  Write-Host '→ lade whisper.cpp …'
  $rel = Invoke-RestMethod 'https://api.github.com/repos/ggml-org/whisper.cpp/releases/latest' -Headers @{ 'User-Agent' = 'serie-einrichtung' }
  $asset = $rel.assets | Where-Object { $_.name -eq 'whisper-bin-x64.zip' } | Select-Object -First 1
  if (-not $asset) { throw 'whisper-bin-x64.zip nicht im neuesten whisper.cpp-Release gefunden.' }
  $zip = Join-Path $env:TEMP 'whisper-bin-x64.zip'
  Invoke-WebRequest $asset.browser_download_url -OutFile $zip
  Expand-Archive $zip -DestinationPath $wOrdner -Force
} else { Write-Host '✓ whisper.cpp ist schon da' }
$modell = Join-Path $wOrdner 'ggml-small.bin'
if (-not (Test-Path $modell)) {
  Write-Host '→ lade Sprachmodell ggml-small (≈ 470 MB) …'
  Invoke-WebRequest 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin' -OutFile $modell
} else { Write-Host '✓ Sprachmodell ist schon da' }

# --- Selbsttest ---
Push-Location (Join-Path $repo 'serie')
npx tsx --test tests/abgleich.test.ts
node scripts/pruefe-curriculum.mjs
Pop-Location

Write-Host ''
Write-Host "Fertig. Projekt liegt in: $repo"
Write-Host 'Nächste Schritte:'
Write-Host '  1. In der Claude-Desktop-App eine Claude-Code-Sitzung im Ordner kotoba-dojo öffnen.'
Write-Host '  2. /status eintippen. Vorschau rendern: „Rendere Folge 1 als Vorschau“ (oder: cd serie; npx tsx scripts/render.ts ep01 --vorschau).'
Write-Host '  3. Aufnahme als serie\recordings\ep01\voice.m4a ablegen, dann /fertig.'
